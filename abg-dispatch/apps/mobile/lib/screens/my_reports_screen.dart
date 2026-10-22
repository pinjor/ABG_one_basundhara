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

/// The reporter's own reports and the stage each one has reached.
class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

/// Filter chips: everything, everything still open, or one stage.
const _filters = ['all', 'open', ...incidentStages];

class _MyReportsScreenState extends State<MyReportsScreen> {
  String _filter = 'all';
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

  Future<PageOf<IncidentRow>> _fetch({String? cursor}) {
    final stage = incidentStages.contains(_filter) ? _filter : null;
    return context.read<DispatchRepository>().myIncidents(
      state: stage == null ? _filter : 'all',
      status: stage,
      cursor: cursor,
    );
  }

  Future<void> _load() async {
    setState(() => _loading = _items.isEmpty);
    try {
      final page = await _fetch();
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
      final page = await _fetch(cursor: _cursor);
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

  String _label(L l, String f) => switch (f) {
    'all' => l.incFilterAll,
    'open' => l.incFilterOpen,
    _ => incidentStatusLabel(l, f),
  };

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
          padding: const EdgeInsets.fromLTRB(0, 8, 0, 40),
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AbgSpace.gutter),
              child: Row(
                children: [
                  for (final f in _filters) ...[
                    if (f != _filters.first) const SizedBox(width: 8),
                    ChoiceChip(
                      label: Text(_label(l, f)),
                      avatar: incidentStages.contains(f)
                          ? Icon(
                              incidentStatusIcon(f),
                              size: 16,
                              color: _filter == f
                                  ? Colors.white
                                  : toneColors(incidentStatusTone(f)).fg,
                            )
                          : null,
                      showCheckmark: false,
                      selected: _filter == f,
                      selectedColor: AbgColors.navy,
                      labelStyle: AbgText.small.copyWith(
                        color: _filter == f ? Colors.white : AbgColors.ink,
                        fontWeight: FontWeight.w600,
                      ),
                      onSelected: (_) {
                        setState(() {
                          _filter = f;
                          _items = [];
                        });
                        unawaited(_load());
                      },
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AbgSpace.gutter),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_loading) ...[
                    const SkeletonCard(),
                    const SizedBox(height: 10),
                    const SkeletonCard(),
                  ] else if (_error != null)
                    ErrorPanel(error: _error!, onRetry: _load)
                  else if (_items.isEmpty)
                    EmptyState(
                      icon: Icons.campaign_outlined,
                      title: _filter == 'all'
                          ? l.incNoReports
                          : l.incNoReportsFilter,
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
                      child: Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The stage, as words and an icon (never colour alone).
class IncidentStatusChip extends StatelessWidget {
  const IncidentStatusChip(this.status, {super.key, this.dense = false});

  final String status;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final label = incidentStatusLabel(L.of(context), status);
    return Semantics(
      label: 'Stage: $label',
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

/// Critical · High · Medium · Low tag, with its icon.
class IncidentSeverityTag extends StatelessWidget {
  const IncidentSeverityTag(this.severity, {super.key, this.dense = true});

  final String severity;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final label = incidentSeverityLabel(L.of(context), severity);
    return Semantics(
      label: 'Severity: $label',
      child: ExcludeSemantics(
        child: ToneBadge(
          label: label,
          tone: incidentSeverityTone(severity),
          icon: incidentSeverityIcon(severity),
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
                      '${item.referenceNumber} · ${incidentGroupLabel(l, item.group)} › ${incidentCategoryLabel(l, item.category)}',
                      style: AbgText.caption,
                      maxLines: 2,
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
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    IncidentStatusChip(item.status, dense: true),
                    IncidentSeverityTag(item.severity),
                    if (item.resolution != null)
                      ToneBadge(
                        label: incidentResolutionLabel(l, item.resolution!),
                        tone: incidentResolutionTone(item.resolution!),
                        icon: incidentResolutionIcon(item.resolution!),
                        dense: true,
                      ),
                    if (item.confidential)
                      ToneBadge(
                        label: l.incConfidentialBadge,
                        tone: Tone.neutral,
                        icon: Icons.lock_outline_rounded,
                        dense: true,
                      ),
                    if (item.anonymous)
                      ToneBadge(
                        label: l.incAnonymousBadge,
                        tone: Tone.neutral,
                        icon: Icons.visibility_off_outlined,
                        dense: true,
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
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
