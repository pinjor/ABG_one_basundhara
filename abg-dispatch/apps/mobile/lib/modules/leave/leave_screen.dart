import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/module_kit.dart';
import '../../widgets/vocab.dart';
import 'leave_api.dart';
import 'leave_models.dart';
import 'leave_widgets.dart';

/// My balance and applications and, for heads of department and HR, a second
/// tab of what waits for their decision with who in the team is away.
class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  late final LeaveApi _api = LeaveApi(context.read<ApiClient>());
  final _scroll = ScrollController();
  String _state = 'all';
  int _tab = 0;
  List<LeaveRow> _items = [];
  List<LeaveBalance> _balances = [];
  int _year = dhakaToday().year;
  List<LeaveApproval> _approvals = [];
  List<TeamAbsence> _team = [];
  String? _cursor;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  bool get _approver => _approvals.isNotEmpty || _team.isNotEmpty;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
    _scroll.addListener(() {
      if (_tab == 0 &&
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
    setState(() => _loading = _items.isEmpty && _balances.isEmpty);
    final today = dhakaToday();
    try {
      final results = await Future.wait<Object?>([
        _api.mine(state: _state),
        _api.balance(),
        _api.approvals().catchError((_) => <LeaveApproval>[]),
        _api
            .team(today, today.add(const Duration(days: 30)))
            .catchError((_) => <TeamAbsence>[]),
      ]);
      if (!mounted) return;
      final page = results[0]! as LeavePage;
      final balance = results[1]! as ({int year, List<LeaveBalance> balances});
      setState(() {
        _items = page.items;
        _cursor = page.nextCursor;
        _balances = balance.balances;
        _year = balance.year;
        _approvals = results[2]! as List<LeaveApproval>;
        _team = results[3]! as List<TeamAbsence>;
        if (!_approver) _tab = 0;
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
    await context.push('/leave/$id');
    if (mounted) unawaited(_load());
  }

  Future<void> _apply([String? type]) async {
    await context.push(type == null ? '/leave/new' : '/leave/new?type=$type');
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.lvTitle),
        actions: [
          IconButton(
            tooltip: l.lvApply,
            icon: const Icon(Icons.add_rounded),
            onPressed: _apply,
          ),
        ],
      ),
      floatingActionButton: _tab == 1
          ? null
          : FloatingActionButton.extended(
              onPressed: _apply,
              backgroundColor: AbgColors.navy,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.beach_access_rounded),
              label: Text(l.lvApply),
            ),
      body: RefreshIndicator(
        color: AbgColors.navy,
        onRefresh: _load,
        child: ListView(
          controller: _scroll,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(0, 8, 0, 96),
          children: [
            if (_approver) ...[
              _pad(
                SegmentTabs(
                  tabs: [
                    (l.lvMyLeave, null),
                    (l.lvToApprove, _approvals.length),
                  ],
                  index: _tab,
                  onChanged: (i) => setState(() => _tab = i),
                ),
              ),
              const SizedBox(height: 14),
            ],
            if (_tab == 1) ..._approvalList(l) else ..._myList(l),
          ],
        ),
      ),
    );
  }

  Widget _pad(Widget child) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: AbgSpace.gutter),
    child: child,
  );

  List<Widget> _myList(L l) {
    final now = _items.where((r) => r.onLeaveNow).firstOrNull;
    return [
      if (_balances.isNotEmpty) ...[
        _pad(SectionTitle(l.lvBalanceTitle('$_year'))),
        LeaveBalanceStrip(balances: _balances, onApply: _apply),
        const SizedBox(height: 18),
      ],
      if (now != null) ...[
        _pad(
          ToneBanner(
            icon: Icons.beach_access_rounded,
            tone: Tone.active,
            body: l.lvOnLeaveBanner(now.referenceNumber),
          ),
        ),
        const SizedBox(height: 14),
      ],
      _pad(
        FilterChips(
          options: [
            ('all', l.kitAll),
            ('open', l.kitOpen),
            ('closed', l.kitClosed),
          ],
          selected: _state,
          onSelected: (v) {
            setState(() {
              _state = v;
              _items = [];
            });
            unawaited(_load());
          },
        ),
      ),
      const SizedBox(height: 14),
      if (_loading) ...[
        _pad(const SkeletonCard()),
        const SizedBox(height: 10),
        _pad(const SkeletonCard()),
      ] else if (_error != null)
        _pad(ErrorPanel(error: _error!, onRetry: _load))
      else if (_items.isEmpty)
        EmptyState(
          icon: Icons.beach_access_outlined,
          title: l.lvNoRequests,
          message: l.lvNoRequestsHint,
          action: l.lvApply,
          onAction: _apply,
        )
      else
        for (final r in _items)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AbgSpace.gutter,
              0,
              AbgSpace.gutter,
              10,
            ),
            child: LeaveCard(leave: r, onTap: () => _open(r.id)),
          ),
      if (_loadingMore)
        const Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
        ),
    ];
  }

  List<Widget> _approvalList(L l) => [
    if (_approvals.isNotEmpty) ...[
      _pad(_WaitingBanner(count: _approvals.length)),
      const SizedBox(height: 12),
      for (final a in _approvals)
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AbgSpace.gutter,
            0,
            AbgSpace.gutter,
            10,
          ),
          child: LeaveApprovalCard(item: a, onTap: () => _open(a.id)),
        ),
    ] else
      EmptyState(
        icon: Icons.inbox_outlined,
        title: l.lvNothingToApprove,
        message: l.lvNothingToApproveHint,
      ),
    const SizedBox(height: 12),
    _pad(SectionTitle(l.lvTeamAway)),
    _pad(_TeamAway(team: _team, onOpen: _open)),
  ];
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
              L.of(context).lvWaitingCount(count),
              style: AbgText.bodyStrong.copyWith(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

/// Who of my direct reports is away in the next 30 days.
class _TeamAway extends StatelessWidget {
  const _TeamAway({required this.team, required this.onOpen});

  final List<TeamAbsence> team;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final rows = [
      for (final p in team)
        for (final r in p.leaves) (p, r),
    ]..sort((a, b) => a.$2.startDate.compareTo(b.$2.startDate));
    if (rows.isEmpty) {
      return SectionCard(child: Text(l.lvTeamNobody, style: AbgText.small));
    }
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) const Divider(height: 1),
            InkWell(
              onTap: () => onOpen(rows[i].$2.id),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    LeaveTypeIcon(rows[i].$2.type, size: 34),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            rows[i].$1.name,
                            style: AbgText.bodyStrong.copyWith(fontSize: 14),
                          ),
                          Text(
                            '${leaveTypeLabel(l, rows[i].$2.type)} · ${leaveWhen(l, rows[i].$2.startDate, rows[i].$2.endDate, rows[i].$2.halfDay)}',
                            style: AbgText.caption,
                          ),
                        ],
                      ),
                    ),
                    if (rows[i].$2.status != 'APPROVED')
                      const Icon(
                        Icons.hourglass_top_rounded,
                        size: 18,
                        color: AbgColors.pending,
                      )
                    else
                      const Icon(
                        Icons.verified_outlined,
                        size: 18,
                        color: AbgColors.success,
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
