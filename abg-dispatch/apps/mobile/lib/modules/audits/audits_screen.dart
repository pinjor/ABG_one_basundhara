import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/module_kit.dart';
import 'audit_api.dart';
import 'audit_models.dart';
import 'audit_widgets.dart';

/// The corrective actions I own and, for the audit team, compliance and
/// office admins, the audits of their offices.
class AuditsScreen extends StatefulWidget {
  const AuditsScreen({super.key});

  @override
  State<AuditsScreen> createState() => _AuditsScreenState();
}

class _AuditsScreenState extends State<AuditsScreen> {
  late final AuditsApi _api = AuditsApi(context.read<ApiClient>());
  late final bool _staff =
      context.read<SessionController>().profile?.can('audits.view') ?? false;
  final _scroll = ScrollController();
  int _tab = 0;
  String _actionState = 'open';
  String _auditStatus = 'OPEN';
  MyAuditActions? _actions;
  List<AuditRow> _audits = [];
  String? _cursor;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_load(first: true));
    _scroll.addListener(() {
      if (_tab == 1 &&
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

  Future<void> _load({bool first = false}) async {
    setState(() => _loading = _actions == null);
    try {
      final results = await Future.wait<Object?>([
        _api.myActions(state: _actionState),
        if (_staff) _api.list(status: _auditStatus),
      ]);
      if (!mounted) return;
      final actions = results[0]! as MyAuditActions;
      setState(() {
        _actions = actions;
        if (_staff) {
          final page =
              results[1]! as ({List<AuditRow> items, String? nextCursor});
          _audits = page.items;
          _cursor = page.nextCursor;
          // Auditors with nothing to fix themselves open on the audits.
          if (first && actions.items.isEmpty) _tab = 1;
        }
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
      final page = await _api.list(status: _auditStatus, cursor: _cursor);
      if (!mounted) return;
      setState(() {
        _audits = [..._audits, ...page.items];
        _cursor = page.nextCursor;
      });
    } catch (_) {
      // Keep what is shown; pulling to refresh tries again.
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _open(String auditId, {String? findingId}) async {
    await context.push(
      findingId == null
          ? '/audits/$auditId'
          : '/audits/$auditId?finding=$findingId',
    );
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = _actions;
    return Scaffold(
      appBar: AppBar(title: Text(l.audTitle)),
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
            if (_staff) ...[
              SegmentTabs(
                tabs: [(l.audMyActions, a?.open), (l.audAudits, null)],
                index: _tab,
                onChanged: (i) => setState(() => _tab = i),
              ),
              const SizedBox(height: 14),
            ],
            if (_loading) ...[
              const SkeletonCard(),
              const SizedBox(height: 10),
              const SkeletonCard(),
            ] else if (_error != null)
              ErrorPanel(error: _error!, onRetry: _load)
            else if (_tab == 1)
              ..._auditList(l)
            else
              ..._actionList(l, a!),
          ],
        ),
      ),
    );
  }

  List<Widget> _actionList(L l, MyAuditActions a) => [
    if (a.open + a.submitted > 0) ...[
      Container(
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
              child: const Icon(
                Icons.build_circle_outlined,
                color: AbgColors.navy,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l.audActionsBanner(a.open, a.submitted),
                    style: AbgText.bodyStrong.copyWith(color: Colors.white),
                  ),
                  if (a.overdue > 0)
                    Text(
                      l.audOverdueCount(a.overdue),
                      style: AbgText.small.copyWith(
                        color: const Color(0xFFFFB4B4),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
    ],
    FilterChips(
      options: [
        ('open', l.kitOpen),
        ('closed', l.kitClosed),
        ('all', l.kitAll),
      ],
      selected: _actionState,
      onSelected: (v) {
        setState(() => _actionState = v);
        unawaited(_load());
      },
    ),
    const SizedBox(height: 14),
    if (a.items.isEmpty)
      EmptyState(
        icon: Icons.task_alt_rounded,
        title: l.audNoActions,
        message: l.audNoActionsHint,
      )
    else
      for (final f in a.items)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: ActionCard(
            finding: f,
            onTap: () => _open(f.audit!.id, findingId: f.id),
          ),
        ),
  ];

  List<Widget> _auditList(L l) => [
    FilterChips(
      options: [
        ('OPEN', l.kitOpen),
        ('CLOSED', l.kitClosed),
        ('ALL', l.kitAll),
      ],
      selected: _auditStatus,
      onSelected: (v) {
        setState(() {
          _auditStatus = v;
          _audits = [];
        });
        unawaited(_load());
      },
    ),
    const SizedBox(height: 14),
    if (_audits.isEmpty)
      EmptyState(
        icon: Icons.fact_check_outlined,
        title: l.audNoAudits,
        message: l.audNoAuditsHint,
      )
    else
      for (final a in _audits)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: AuditCard(audit: a, onTap: () => _open(a.id)),
        ),
    if (_loadingMore)
      const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
  ];
}
