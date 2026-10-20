import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/formatting.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import '../widgets/vocab.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String? _category;
  List<AppNotification> _items = [];
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final page = await context.read<DispatchRepository>().notifications(
        category: _category,
      );
      if (mounted) {
        setState(() {
          _items = page.items;
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  Future<void> _readAll() async {
    final repo = context.read<DispatchRepository>();
    final badge = context.read<NotificationBadge>();
    await repo.markAllRead();
    await badge.refresh();
    await _load();
  }

  Future<void> _open(AppNotification n) async {
    final repo = context.read<DispatchRepository>();
    final badge = context.read<NotificationBadge>();
    if (!n.read) {
      setState(() => n.read = true);
      unawaited(repo.markRead(n.id).then((_) => badge.refresh()));
    }
    if (n.incidentId != null) {
      await context.push('/incidents/${n.incidentId}');
    } else if (n.parcelId != null) {
      await context.push('/parcels/${n.parcelId}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final badge = context.watch<NotificationBadge>();
    final filters = [
      (null, l.filterAll),
      ('ACTION_REQUIRED', l.filterAction),
      ('PARCEL_UPDATE', l.filterUpdates),
      ('SYSTEM', l.filterSystem),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(l.notificationsTitle),
        actions: [
          if (badge.total > 0)
            TextButton.icon(
              onPressed: _readAll,
              icon: const Icon(Icons.done_all_rounded, size: 18),
              label: Text(l.markAllRead),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          SizedBox(
            height: 54,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: AbgSpace.gutter,
                vertical: 6,
              ),
              children: [
                for (final f in filters)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(
                        f.$1 == 'ACTION_REQUIRED' && badge.actionRequired > 0
                            ? '${f.$2} · ${badge.actionRequired}'
                            : f.$2,
                      ),
                      selected: _category == f.$1,
                      showCheckmark: false,
                      labelStyle: AbgText.small.copyWith(
                        color: _category == f.$1 ? Colors.white : AbgColors.ink,
                        fontWeight: FontWeight.w600,
                      ),
                      onSelected: (_) {
                        setState(() {
                          _category = f.$1;
                          _loading = true;
                        });
                        unawaited(_load());
                      },
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? ListView(
                    padding: const EdgeInsets.all(AbgSpace.gutter),
                    children: const [
                      SkeletonCard(),
                      SizedBox(height: 10),
                      SkeletonCard(),
                    ],
                  )
                : _error != null
                ? ErrorPanel(error: _error!, onRetry: _load)
                : RefreshIndicator(
                    color: AbgColors.navy,
                    onRefresh: _load,
                    child: _items.isEmpty
                        ? ListView(
                            children: [
                              EmptyState(
                                icon: Icons.notifications_none_rounded,
                                title: l.noNotifications,
                                message: l.allCaughtUp,
                              ),
                            ],
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(
                              AbgSpace.gutter,
                              8,
                              AbgSpace.gutter,
                              120,
                            ),
                            itemCount: _items.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 10),
                            itemBuilder: (_, i) => _NotificationTile(
                              item: _items[i],
                              onTap: () => _open(_items[i]),
                            ),
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});

  final AppNotification item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final action = item.category == 'ACTION_REQUIRED';
    final incidentTone = item.incidentId == null
        ? null
        : toneColors(
            item.eventType == 'INCIDENT_REPORTED'
                ? Tone.pending
                : incidentStatusTone(item.incidentStatus ?? 'PENDING'),
          );
    final (icon, fg, bg) = switch (item.eventType) {
      _ when incidentTone != null => (
        item.eventType == 'INCIDENT_REPORTED'
            ? Icons.campaign_outlined
            : incidentStatusIcon(item.incidentStatus ?? 'PENDING'),
        incidentTone.fg,
        incidentTone.bg,
      ),
      'RECEIVED' => (
        Icons.verified_outlined,
        AbgColors.success,
        AbgColors.successSoft,
      ),
      'EXCEPTION_RECORDED' || 'DELIVERY_FAILED' || 'SLA_ESCALATED' => (
        Icons.report_problem_outlined,
        AbgColors.danger,
        AbgColors.dangerSoft,
      ),
      'CARRIER_ASSIGNED' || 'CARRIER_REASSIGNED' => (
        Icons.directions_walk_rounded,
        AbgColors.active,
        AbgColors.activeSoft,
      ),
      'PICKED_UP' || 'IN_TRANSIT' => (
        Icons.local_shipping_outlined,
        AbgColors.active,
        AbgColors.activeSoft,
      ),
      'PENDING_RECEIPT' || 'SLA_REMINDER' || 'HANDOVER_REQUESTED' => (
        Icons.pending_actions_rounded,
        AbgColors.pending,
        AbgColors.pendingSoft,
      ),
      _ => (
        Icons.inventory_2_outlined,
        AbgColors.navy500,
        AbgColors.neutralSoft,
      ),
    };
    return SectionCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      color: item.read ? AbgColors.white : const Color(0xFFFBFCFE),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: fg, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        style: AbgText.bodyStrong.copyWith(
                          fontSize: 14.5,
                          fontWeight: item.read
                              ? FontWeight.w600
                              : FontWeight.w700,
                        ),
                      ),
                    ),
                    Text(relative(item.createdAt, l), style: AbgText.caption),
                  ],
                ),
                const SizedBox(height: 3),
                Text(item.body, style: AbgText.small),
                if (action) ...[
                  const SizedBox(height: 8),
                  Text(
                    l.actionRequired.toUpperCase(),
                    style: AbgText.overline.copyWith(
                      color: AbgColors.pending,
                      fontSize: 10,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (!item.read) ...[
            const SizedBox(width: 8),
            Semantics(
              label: 'Unread',
              child: Container(
                width: 9,
                height: 9,
                margin: const EdgeInsets.only(top: 6),
                decoration: const BoxDecoration(
                  color: AbgColors.active,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
