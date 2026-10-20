import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/formatting.dart';
import '../core/session.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';
import '../widgets/parcel_card.dart';
import '../widgets/sync_banner.dart';
import '../widgets/vocab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  ParcelSummary? _summary;
  List<ParcelRow> _attention = [];
  List<ParcelRow> _recent = [];
  int? _openReports;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    final repo = context.read<DispatchRepository>();
    final courier =
        context.read<SessionController>().profile?.isCourier ?? false;
    try {
      final results = await Future.wait([
        repo.summary(),
        repo.parcels(box: 'INCOMING', view: 'PENDING_RECEIPT', limit: 4),
        if (courier)
          repo.parcels(box: 'ASSIGNED', limit: 4)
        else
          repo.parcels(box: 'OUTGOING', view: 'AWAITING_PICKUP', limit: 3),
        repo.parcels(box: 'ALL', limit: 6),
      ]);
      final waiting = (results[1] as PageOf<ParcelRow>).items;
      final other = (results[2] as PageOf<ParcelRow>).items;
      if (!mounted) return;
      setState(() {
        _summary = results[0] as ParcelSummary;
        _attention = [
          ...waiting,
          ...other.where((p) => !waiting.any((w) => w.id == p.id)),
        ].take(5).toList();
        _recent = (results[3] as PageOf<ParcelRow>).items;
        _error = null;
        _loading = false;
      });
      unawaited(context.read<NotificationBadge>().refresh());
      unawaited(_loadReports(repo));
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadReports(DispatchRepository repo) async {
    if (!(context.read<SessionController>().profile?.can('incident.report') ??
        false)) {
      return;
    }
    try {
      final open = await repo.myIncidents(state: 'open');
      if (mounted) setState(() => _openReports = open.items.length);
    } catch (_) {
      // The card still works without the count.
    }
  }

  String _greeting(L l, String name) {
    final h = toDhaka(DateTime.now()).hour;
    if (h < 12) return l.greetingMorning(name);
    if (h < 17) return l.greetingAfternoon(name);
    return l.greetingEvening(name);
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final session = context.watch<SessionController>();
    final profile = session.profile;
    final badge = context.watch<NotificationBadge>();
    final top = MediaQuery.of(context).padding.top;
    final courier = profile?.isCourier ?? false;

    return Scaffold(
      body: RefreshIndicator(
        color: AbgColors.navy,
        onRefresh: _load,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: HeroBackground(
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(30),
                ),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    AbgSpace.gutter,
                    top + 14,
                    AbgSpace.gutter,
                    24,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const AbgLogo(width: 64, markOnly: true),
                          const SizedBox(width: 10),
                          Container(
                            width: 1,
                            height: 22,
                            color: Colors.white24,
                          ),
                          const SizedBox(width: 10),
                          const DispatchWordmark(size: 11),
                          const Spacer(),
                          _HeaderIcon(
                            icon: Icons.notifications_none_rounded,
                            badge: badge.total,
                            tooltip: l.notificationsTitle,
                            onTap: () => StatefulNavigationShell.maybeOf(
                              context,
                            )?.goBranch(2),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => StatefulNavigationShell.maybeOf(
                              context,
                            )?.goBranch(3),
                            child: Avatar(
                              initials: profile?.employee?.initials ?? '?',
                              size: 40,
                              dark: true,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 26),
                      Text(
                        _greeting(l, profile?.firstName ?? ''),
                        style: AbgText.h1.copyWith(
                          color: Colors.white,
                          fontSize: 26,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        [
                          profile?.employee?.designation,
                          profile?.employee?.branch,
                        ].whereType<String>().join(' · '),
                        style: AbgText.small.copyWith(
                          color: AbgColors.platinum,
                        ),
                      ),
                      const SizedBox(height: 22),
                      if (profile?.can('parcel.create') ?? false)
                        _SendCard(
                          title: l.sendParcel,
                          subtitle: l.sendParcelHint,
                          onTap: () => context.push('/create'),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AbgSpace.gutter,
                18,
                AbgSpace.gutter,
                120,
              ),
              sliver: SliverList.list(
                children: [
                  const SyncBanner(),
                  SectionTitle(l.myActivity),
                  _StatsGrid(
                    summary: _summary,
                    courier: courier,
                    loading: _loading,
                  ),
                  if (profile?.can('incident.report') ?? false) ...[
                    const SizedBox(height: 14),
                    _ReportCard(
                      openReports: _openReports,
                      onReport: () async {
                        await context.push('/incidents/new');
                        if (mounted) unawaited(_load());
                      },
                      onMyReports: () async {
                        await context.push('/incidents');
                        if (mounted) unawaited(_load());
                      },
                    ),
                  ],
                  const SizedBox(height: 22),
                  if (_error != null)
                    ErrorPanel(error: _error!, onRetry: _load)
                  else ...[
                    SectionTitle(l.actionRequired),
                    if (_loading)
                      const SkeletonCard()
                    else if (_attention.isEmpty)
                      SectionCard(
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: AbgColors.successSoft,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.task_alt_rounded,
                                color: AbgColors.success,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    l.allCaughtUp,
                                    style: AbgText.bodyStrong,
                                  ),
                                  Text(l.nothingWaiting, style: AbgText.small),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ..._attention.map(
                        (p) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: ParcelCard(
                            parcel: p,
                            onTap: () => _open(p.id),
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),
                    SectionTitle(
                      l.recentParcels,
                      action: l.seeAll,
                      onAction: () =>
                          StatefulNavigationShell.maybeOf(context)?.goBranch(1),
                    ),
                    if (_loading) ...[
                      const SkeletonCard(),
                      const SizedBox(height: 10),
                      const SkeletonCard(),
                    ],
                    if (!_loading && _recent.isEmpty)
                      EmptyState(
                        icon: Icons.inventory_2_outlined,
                        title: l.noParcels,
                        message: l.noParcelsHint,
                      ),
                    ..._recent.map(
                      (p) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: ParcelCard(parcel: p, onTap: () => _open(p.id)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _open(String id) async {
    await context.push('/parcels/$id');
    if (mounted) unawaited(_load());
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({
    required this.icon,
    required this.onTap,
    required this.tooltip,
    this.badge = 0,
  });

  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.08),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Icon(icon, color: AbgColors.platinumBright, size: 22),
              if (badge > 0)
                Positioned(
                  top: 9,
                  right: 10,
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: AbgColors.danger,
                      shape: BoxShape.circle,
                      border: Border.all(color: AbgColors.midnight, width: 1.5),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SendCard extends StatelessWidget {
  const _SendCard({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: title,
      child: Container(
        decoration: BoxDecoration(
          gradient: AbgGradients.platinum,
          borderRadius: BorderRadius.circular(AbgRadii.lg),
          boxShadow: const [
            BoxShadow(
              color: Color(0x55000000),
              blurRadius: 24,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: BorderRadius.circular(AbgRadii.lg),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
              child: Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      gradient: AbgGradients.hero,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.add_rounded,
                      color: AbgColors.platinumBright,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: AbgText.h3.copyWith(
                            color: AbgColors.navy,
                            fontSize: 17,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          style: AbgText.caption.copyWith(
                            color: AbgColors.navy500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.arrow_forward_rounded,
                    color: AbgColors.navy,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({
    required this.summary,
    required this.courier,
    required this.loading,
  });

  final ParcelSummary? summary;
  final bool courier;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final s = summary ?? ParcelSummary();
    final tiles = [
      _Stat(
        l.inTransit,
        s.inTransit,
        Icons.local_shipping_outlined,
        Tone.active,
      ),
      _Stat(
        l.waitingForMe,
        s.waitingForMe,
        Icons.pending_actions_rounded,
        Tone.pending,
      ),
      _Stat(
        l.pendingPickup,
        s.pendingPickup,
        Icons.schedule_rounded,
        Tone.neutral,
      ),
      courier
          ? _Stat(
              l.assignedToMe,
              s.assignedToMe,
              Icons.directions_walk_rounded,
              Tone.success,
            )
          : _Stat(
              l.tabOutgoing,
              s.outgoingActive,
              Icons.outbox_rounded,
              Tone.success,
            ),
    ];
    return GridView.count(
      crossAxisCount: 2,
      padding: EdgeInsets.zero,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.55,
      children: tiles.map((t) => _StatTile(stat: t, loading: loading)).toList(),
    );
  }
}

class _Stat {
  _Stat(this.label, this.value, this.icon, this.tone);
  final String label;
  final int value;
  final IconData icon;
  final Tone tone;
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.stat, required this.loading});

  final _Stat stat;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final c = toneColors(stat.tone);
    return Semantics(
      label: '${stat.label}: ${stat.value}',
      child: SectionCard(
        padding: const EdgeInsets.all(14),
        onTap: () => StatefulNavigationShell.maybeOf(context)?.goBranch(1),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: c.bg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(stat.icon, color: c.fg, size: 19),
                ),
                const Spacer(),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AbgColors.borderStrong,
                  size: 20,
                ),
              ],
            ),
            const Spacer(),
            loading
                ? const Skeleton(width: 36, height: 24)
                : Text(
                    '${stat.value}',
                    style: AbgText.h1.copyWith(fontSize: 26, height: 1),
                  ),
            const SizedBox(height: 4),
            Text(
              stat.label,
              style: AbgText.small.copyWith(fontSize: 12.5),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

/// Entry point for workplace incident reports, under the activity tiles.
class _ReportCard extends StatelessWidget {
  const _ReportCard({
    required this.openReports,
    required this.onReport,
    required this.onMyReports,
  });

  final int? openReports;
  final VoidCallback onReport;
  final VoidCallback onMyReports;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return SectionCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          InkWell(
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AbgRadii.lg),
            ),
            onTap: onReport,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 10, 12),
              child: Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      gradient: AbgGradients.hero,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.campaign_rounded,
                      color: AbgColors.platinum,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l.incReport,
                          style: AbgText.h3.copyWith(fontSize: 16),
                        ),
                        const SizedBox(height: 2),
                        Text(l.incReportHint, style: AbgText.caption),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.add_a_photo_outlined,
                    color: AbgColors.navy500,
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          InkWell(
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(AbgRadii.lg),
            ),
            onTap: onMyReports,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 10, 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.fact_check_outlined,
                    size: 19,
                    color: AbgColors.navy500,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    l.incMyReports,
                    style: AbgText.bodyStrong.copyWith(fontSize: 14),
                  ),
                  const Spacer(),
                  if (openReports != null)
                    Text(
                      l.incOpenCount(openReports!),
                      style: AbgText.caption.copyWith(
                        color: openReports! > 0
                            ? AbgColors.pending
                            : AbgColors.inkSubtle,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AbgColors.borderStrong,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
