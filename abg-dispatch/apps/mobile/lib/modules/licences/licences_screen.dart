import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'licence_models.dart';
import 'licence_widgets.dart';

/// The licence register for the offices the viewer looks after: what has
/// expired, what is about to, and where each renewal stands. Read-only.
class LicencesScreen extends StatefulWidget {
  const LicencesScreen({super.key});

  @override
  State<LicencesScreen> createState() => _LicencesScreenState();
}

class _LicencesScreenState extends State<LicencesScreen> {
  static const _filters = [
    null,
    'EXPIRING',
    'DUE_SOON',
    'EXPIRED',
    'RENEWAL_IN_PROGRESS',
    'VALID',
  ];

  late final LicenceApi _api = LicenceApi(context.read<ApiClient>());
  String? _state;
  List<LicenceRow> _items = [];
  LicenceSummary? _summary;
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
      final results = await Future.wait([
        _api.list(state: _state),
        _api.summary(),
      ]);
      if (!mounted) return;
      final page = results[0] as LicencePage;
      setState(() {
        _items = page.items;
        _cursor = page.nextCursor;
        _summary = results[1] as LicenceSummary;
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
      final page = await _api.list(state: _state, cursor: _cursor);
      if (!mounted) return;
      setState(() {
        _items = [..._items, ...page.items];
        _cursor = page.nextCursor;
      });
    } catch (_) {
      // Pull to refresh retries; the list already shown stays.
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  String _filterLabel(L l, String? f) => switch (f) {
    'EXPIRING' => l.licFilterEXPIRING,
    'DUE_SOON' => l.licFilterDUE_SOON,
    'EXPIRED' => l.licFilterEXPIRED,
    'RENEWAL_IN_PROGRESS' => l.licFilterRENEWAL_IN_PROGRESS,
    'VALID' => l.licFilterVALID,
    _ => l.licFilterAll,
  };

  int? _filterCount(String? f) {
    final s = _summary;
    if (s == null) return null;
    return switch (f) {
      'EXPIRING' => s.expiring,
      'DUE_SOON' => s.dueSoon,
      'EXPIRED' => s.expired,
      'RENEWAL_IN_PROGRESS' => s.renewalsInProgress,
      'VALID' => s.valid,
      _ => s.total,
    };
  }

  Future<void> _open(String id) async {
    await context.push('/licences/$id');
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.licTitle)),
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
            if (_summary != null) ...[
              _SummaryHero(summary: _summary!, onOpen: _open),
              const SizedBox(height: 16),
            ],
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final f in _filters)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(
                          _filterCount(f) == null
                              ? _filterLabel(l, f)
                              : '${_filterLabel(l, f)} · ${_filterCount(f)}',
                        ),
                        selected: _state == f,
                        materialTapTargetSize: MaterialTapTargetSize.padded,
                        onSelected: (_) {
                          setState(() {
                            _state = f;
                            _items = [];
                            _cursor = null;
                          });
                          unawaited(_load());
                        },
                      ),
                    ),
                ],
              ),
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
                icon: Icons.verified_outlined,
                title: l.licNoLicences,
                message: l.licNoLicencesHint,
              )
            else
              for (final item in _items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: LicenceCard(item: item, onTap: () => _open(item.id)),
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

/// Navy summary: how many licences have expired, are expiring, are due for renewal and are valid.
class _SummaryHero extends StatelessWidget {
  const _SummaryHero({required this.summary, required this.onOpen});

  final LicenceSummary summary;
  final void Function(String id) onOpen;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final s = summary;
    final tiles = [
      (l.licStateEXPIRED, s.expired, const Color(0xFFFF8A8A)),
      (l.licWithin30, s.expiring, const Color(0xFFFFB4A8)),
      (l.licStateDUE_SOON, s.dueSoon, const Color(0xFFF2C46B)),
      (l.licStateVALID, s.valid, const Color(0xFF6FD9A6)),
    ];
    return Container(
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.xl),
        boxShadow: AbgShadows.card,
      ),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Overline(l.licRegister, color: AbgColors.platinumDeep),
          const SizedBox(height: 12),
          Row(
            children: [
              for (final (label, value, colour) in tiles)
                Expanded(
                  child: Semantics(
                    label: '$label: $value',
                    child: ExcludeSemantics(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$value',
                            style: AbgText.h1.copyWith(
                              color: value == 0 ? AbgColors.white : colour,
                              fontFeatures: const [
                                FontFeature.tabularFigures(),
                              ],
                            ),
                          ),
                          Text(
                            label,
                            maxLines: 2,
                            style: AbgText.caption.copyWith(
                              color: AbgColors.platinum,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (s.nextId != null) ...[
            const SizedBox(height: 10),
            const Divider(color: Colors.white12, height: 1),
            InkWell(
              borderRadius: BorderRadius.circular(AbgRadii.md),
              onTap: () => onOpen(s.nextId!),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: kMinTap),
                child: Row(
                  children: [
                    const Icon(
                      Icons.schedule_rounded,
                      size: 18,
                      color: AbgColors.platinum,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${l.licNextToExpire}: ${s.nextName} · ${s.nextBranch ?? ''} — ${licenceCountdownLabel(l, s.nextDaysLeft ?? 0)}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AbgText.small.copyWith(
                          color: AbgColors.platinumBright,
                        ),
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: AbgColors.platinum,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
