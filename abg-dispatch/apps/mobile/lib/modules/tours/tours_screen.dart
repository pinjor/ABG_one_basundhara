import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'tour_api.dart';
import 'tour_models.dart';
import 'tour_widgets.dart';

/// My tour requests and, for approvers, a second tab of what is waiting for
/// their decision.
class ToursScreen extends StatefulWidget {
  const ToursScreen({super.key});

  @override
  State<ToursScreen> createState() => _ToursScreenState();
}

class _ToursScreenState extends State<ToursScreen> {
  late final ToursApi _api = ToursApi(context.read<ApiClient>());
  final _scroll = ScrollController();
  String _state = 'all';
  bool _approvalsTab = false;
  List<TourRow> _items = [];
  List<TourApproval> _approvals = [];
  String? _cursor;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
    _scroll.addListener(() {
      if (!_approvalsTab &&
          _scroll.position.pixels > _scroll.position.maxScrollExtent - 300) {
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
    setState(() => _loading = _items.isEmpty && _approvals.isEmpty);
    try {
      final results = await Future.wait([
        _api.mine(state: _state),
        _api.approvals().catchError((_) => <TourApproval>[]),
      ]);
      if (!mounted) return;
      final page = results[0] as TourPage<TourRow>;
      final approvals = results[1] as List<TourApproval>;
      setState(() {
        _items = page.items;
        _cursor = page.nextCursor;
        _approvals = approvals;
        if (approvals.isEmpty) _approvalsTab = false;
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
      final page = await _api.mine(state: _state, cursor: _cursor);
      if (!mounted) return;
      setState(() {
        _items = [..._items, ...page.items];
        _cursor = page.nextCursor;
      });
    } catch (_) {
      // Keep what is shown; pulling to refresh tries again.
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _open(String id) async {
    await context.push('/tours/$id');
    if (mounted) unawaited(_load());
  }

  Future<void> _apply() async {
    await context.push('/tours/new');
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.tourTitle),
        actions: [
          IconButton(
            tooltip: l.tourApply,
            icon: const Icon(Icons.add_rounded),
            onPressed: _apply,
          ),
        ],
      ),
      floatingActionButton: _approvalsTab
          ? null
          : FloatingActionButton.extended(
              onPressed: _apply,
              backgroundColor: AbgColors.navy,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.flight_takeoff_rounded),
              label: Text(l.tourApply),
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
            96,
          ),
          children: [
            if (_approvals.isNotEmpty) ...[
              _Tabs(
                approvals: _approvals.length,
                approvalsTab: _approvalsTab,
                onChanged: (v) => setState(() => _approvalsTab = v),
              ),
              const SizedBox(height: 14),
            ],
            if (_approvalsTab) ..._approvalList(l) else ..._myList(l),
          ],
        ),
      ),
    );
  }

  List<Widget> _approvalList(L l) => [
    _WaitingBanner(count: _approvals.length),
    const SizedBox(height: 12),
    if (_approvals.isEmpty)
      EmptyState(
        icon: Icons.inbox_outlined,
        title: l.tourNothingToApprove,
        message: l.tourNothingToApproveHint,
      )
    else
      for (final a in _approvals)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: TourApprovalCard(item: a, onTap: () => _open(a.id)),
        ),
  ];

  List<Widget> _myList(L l) => [
    Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final (value, label) in [
          ('all', l.tourFilterAll),
          ('open', l.tourFilterOpen),
          ('closed', l.tourFilterClosed),
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
        icon: Icons.flight_outlined,
        title: l.tourNoRequests,
        message: l.tourNoRequestsHint,
        action: l.tourApply,
        onAction: _apply,
      )
    else
      for (final t in _items)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: TourCard(tour: t, onTap: () => _open(t.id)),
        ),
    if (_loadingMore)
      const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
  ];
}

/// "My requests | To approve (n)" — shown only to people with something to approve.
class _Tabs extends StatelessWidget {
  const _Tabs({
    required this.approvals,
    required this.approvalsTab,
    required this.onChanged,
  });

  final int approvals;
  final bool approvalsTab;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    Widget tab(String label, bool value, {int? count}) {
      final on = approvalsTab == value;
      return Expanded(
        child: Semantics(
          selected: on,
          button: true,
          child: InkWell(
            borderRadius: BorderRadius.circular(AbgRadii.md),
            onTap: () => onChanged(value),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              height: kMinTap,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: on ? AbgColors.navy : Colors.transparent,
                borderRadius: BorderRadius.circular(AbgRadii.md),
                boxShadow: on ? AbgShadows.card : null,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(
                    child: Text(
                      label,
                      overflow: TextOverflow.ellipsis,
                      style: AbgText.bodyStrong.copyWith(
                        fontSize: 14,
                        color: on ? Colors.white : AbgColors.inkMuted,
                      ),
                    ),
                  ),
                  if (count != null) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: on ? Colors.white24 : AbgColors.pending,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '$count',
                        style: AbgText.caption.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AbgColors.white,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        border: Border.all(color: AbgColors.border),
      ),
      child: Row(
        children: [
          tab(l.tourMyRequests, false),
          const SizedBox(width: 4),
          tab(l.tourToApprove, true, count: approvals),
        ],
      ),
    );
  }
}

class _WaitingBanner extends StatelessWidget {
  const _WaitingBanner({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: AbgGradients.platinum,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.approval_outlined, color: AbgColors.navy),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              L.of(context).tourWaitingCount(count),
              style: AbgText.bodyStrong.copyWith(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
