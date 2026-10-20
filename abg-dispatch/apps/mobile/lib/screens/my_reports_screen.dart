import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/formatting.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import '../widgets/vocab.dart';

/// The reporter's own incident reports and where each one stands.
class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  String _state = 'all';
  List<IncidentRow> _items = [];
  String? _cursor;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    unawaited(_load());
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 300) {
        unawaited(_more());
      }
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = _items.isEmpty);
    try {
      final page = await context.read<DispatchRepository>().myIncidents(
        state: _state,
      );
      if (!mounted) return;
      setState(() {
        _items = page.items;
        _cursor = page.nextCursor;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  Future<void> _more() async {
    if (_cursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final page = await context.read<DispatchRepository>().myIncidents(
        state: _state,
        cursor: _cursor,
      );
      if (!mounted) return;
      setState(() {
        _items = [..._items, ...page.items];
        _cursor = page.nextCursor;
      });
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _report() async {
    await context.push('/incidents/new');
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.incMyReports),
        actions: [
          IconButton(
            tooltip: l.incReport,
            icon: const Icon(Icons.add_a_photo_outlined),
            onPressed: _report,
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AbgColors.navy,
        onRefresh: _load,
        child: ListView(
          controller: _scroll,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            AbgSpace.gutter,
            8,
            AbgSpace.gutter,
            40,
          ),
          children: [
            Wrap(
              spacing: 8,
              children: [
                for (final (value, label) in [
                  ('all', l.incFilterAll),
                  ('open', l.incFilterOpen),
                  ('closed', l.incFilterClosed),
                ])
                  ChoiceChip(
                    label: Text(label),
                    selected: _state == value,
                    onSelected: (_) {
                      setState(() {
                        _state = value;
                        _items = [];
                      });
                      unawaited(_load());
                    },
                  ),
              ],
            ),
            const SizedBox(height: 14),
            if (_loading) ...[
              const SkeletonCard(),
              const SizedBox(height: 10),
              const SkeletonCard(),
            ] else if (_error != null)
              ErrorPanel(error: _error!, onRetry: _load)
            else if (_items.isEmpty)
              EmptyState(
                icon: Icons.campaign_outlined,
                title: l.incNoReports,
                message: l.incNoReportsHint,
                action: l.incReport,
                onAction: _report,
              )
            else
              for (final item in _items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: IncidentCard(
                    item: item,
                    onTap: () async {
                      await context.push('/incidents/${item.id}');
                      if (mounted) unawaited(_load());
                    },
                  ),
                ),
            if (_loadingMore)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              ),
          ],
        ),
      ),
    );
  }
}

class IncidentStatusChip extends StatelessWidget {
  const IncidentStatusChip(this.status, {super.key, this.dense = false});

  final String status;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final label = incidentStatusLabel(L.of(context), status);
    return Semantics(
      label: 'Status: $label',
      child: ExcludeSemantics(
        child: ToneBadge(
          label: label,
          tone: incidentStatusTone(status),
          icon: incidentStatusIcon(status),
          dense: dense,
        ),
      ),
    );
  }
}

class IncidentCard extends StatelessWidget {
  const IncidentCard({super.key, required this.item, required this.onTap});

  final IncidentRow item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(AbgRadii.md),
                child: SizedBox(
                  width: 58,
                  height: 58,
                  child: item.thumbnailUrl != null
                      ? Image.network(
                          apiUrl(item.thumbnailUrl!),
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              _CategoryIcon(item.category),
                        )
                      : _CategoryIcon(item.category),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${item.referenceNumber} · ${incidentCategoryLabel(l, item.category)}',
                      style: AbgText.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      item.place ?? item.branchName,
                      style: AbgText.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              IncidentStatusChip(item.status, dense: true),
              if (item.anonymous) ...[
                const SizedBox(width: 6),
                ToneBadge(
                  label: l.incAnonymousBadge,
                  tone: Tone.neutral,
                  icon: Icons.visibility_off_outlined,
                  dense: true,
                ),
              ],
              const Spacer(),
              Text(relative(item.statusChangedAt, l), style: AbgText.caption),
            ],
          ),
          if (item.statusNote != null && item.statusNote!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '“${item.statusNote}”',
              style: AbgText.small.copyWith(
                color: AbgColors.inkMuted,
                fontStyle: FontStyle.italic,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

class _CategoryIcon extends StatelessWidget {
  const _CategoryIcon(this.category);
  final String category;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AbgColors.platinumBright,
      child: Icon(incidentCategoryIcon(category), color: AbgColors.navy500),
    );
  }
}
