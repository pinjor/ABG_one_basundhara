import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../core/session.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/module_kit.dart';
import '../tours/tour_models.dart' show dhakaToday;
import 'appointment_api.dart';
import 'appointment_models.dart';
import 'appointment_widgets.dart';

/// My meeting requests and, for the people asked (and the executive office
/// for the MD and the Chairman), what waits for an answer and the diary.
class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  late final AppointmentsApi _api = AppointmentsApi(context.read<ApiClient>());
  final _scroll = ScrollController();
  String _state = 'open';
  int _tab = 0;
  List<AppointmentRow> _items = [];
  List<AppointmentRow> _inbox = [];
  List<AppointmentRow> _diary = [];
  String? _cursor;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  bool get _office =>
      context.read<SessionController>().profile?.can('appointment.manage') ??
      false;
  bool get _hostSide => _office || _inbox.isNotEmpty || _diary.isNotEmpty;

  @override
  void initState() {
    super.initState();
    unawaited(_load(first: true));
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

  Future<void> _load({bool first = false}) async {
    setState(() => _loading = _items.isEmpty);
    final today = dhakaToday();
    try {
      final results = await Future.wait<Object?>([
        _api.mine(state: _state),
        _api.inbox().catchError((_) => <AppointmentRow>[]),
        _api
            .diary(today, today.add(const Duration(days: 14)))
            .catchError((_) => <AppointmentRow>[]),
      ]);
      if (!mounted) return;
      final page = results[0]! as AppointmentPage;
      setState(() {
        _items = page.items;
        _cursor = page.nextCursor;
        _inbox = results[1]! as List<AppointmentRow>;
        _diary = (results[2]! as List<AppointmentRow>)
            .where((r) => r.status == 'CONFIRMED' || r.status == 'PROPOSED')
            .toList();
        // The executive office opens on what waits for an answer.
        if (first && _office && _inbox.isNotEmpty) _tab = 1;
        if (!_hostSide) _tab = 0;
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
    await context.push('/appointments/$id');
    if (mounted) unawaited(_load());
  }

  Future<void> _request() async {
    await context.push('/appointments/new');
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.aptTitle),
        actions: [
          IconButton(
            tooltip: l.aptRequest,
            icon: const Icon(Icons.add_rounded),
            onPressed: _request,
          ),
        ],
      ),
      floatingActionButton: _tab != 0
          ? null
          : FloatingActionButton.extended(
              onPressed: _request,
              backgroundColor: AbgColors.navy,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.event_rounded),
              label: Text(l.aptRequest),
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
            if (_hostSide) ...[
              SegmentTabs(
                tabs: [
                  (l.aptMine, null),
                  (l.aptToAnswer, _inbox.length),
                  (l.aptDiary, null),
                ],
                index: _tab,
                onChanged: (i) => setState(() => _tab = i),
              ),
              const SizedBox(height: 14),
            ],
            ...switch (_tab) {
              1 => _inboxList(l),
              2 => _diaryList(l),
              _ => _myList(l),
            },
          ],
        ),
      ),
    );
  }

  List<Widget> _myList(L l) => [
    FilterChips(
      options: [
        ('open', l.kitOpen),
        ('closed', l.kitClosed),
        ('all', l.kitAll),
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
    const SizedBox(height: 14),
    if (_loading) ...[
      const SkeletonCard(),
      const SizedBox(height: 10),
      const SkeletonCard(),
    ] else if (_error != null)
      ErrorPanel(error: _error!, onRetry: _load)
    else if (_items.isEmpty)
      EmptyState(
        icon: Icons.event_outlined,
        title: l.aptNoRequests,
        message: l.aptNoRequestsHint,
        action: l.aptRequest,
        onAction: _request,
      )
    else
      for (final a in _items)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: AppointmentCard(item: a, onTap: () => _open(a.id)),
        ),
    if (_loadingMore)
      const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
  ];

  List<Widget> _inboxList(L l) => [
    if (_inbox.isEmpty)
      EmptyState(
        icon: Icons.inbox_outlined,
        title: l.aptNothingToAnswer,
        message: l.aptNothingToAnswerHint,
      )
    else ...[
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
                Icons.event_note_rounded,
                color: AbgColors.navy,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                l.aptWaitingCount(_inbox.length),
                style: AbgText.bodyStrong.copyWith(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      for (final a in _inbox)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: AppointmentCard(
            item: a,
            hostSide: true,
            showHost: _office,
            onTap: () => _open(a.id),
          ),
        ),
    ],
  ];

  List<Widget> _diaryList(L l) {
    if (_diary.isEmpty) {
      return [
        EmptyState(icon: Icons.calendar_month_outlined, title: l.aptDiaryEmpty),
      ];
    }
    final byDay = <String, List<AppointmentRow>>{};
    for (final a in _diary) {
      final d = toDhaka(a.when);
      byDay.putIfAbsent(DateFormat('yyyy-MM-dd').format(d), () => []).add(a);
    }
    return [
      for (final entry in byDay.entries) ...[
        SectionTitle(
          DateFormat.MMMMEEEEd(l.localeName).format(DateTime.parse(entry.key)),
        ),
        for (final a in entry.value)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _DiaryRow(item: a, onTap: () => _open(a.id)),
          ),
        const SizedBox(height: 6),
      ],
    ];
  }
}

class _DiaryRow extends StatelessWidget {
  const _DiaryRow({required this.item, required this.onTap});

  final AppointmentRow item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = item;
    final t = DateFormat.jm(l.localeName);
    final start = toDhaka(a.when);
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(0, 0, 14, 0),
      onTap: onTap,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: a.status == 'CONFIRMED'
                    ? AbgColors.success
                    : AbgColors.pending,
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(AbgRadii.lg),
                ),
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 72,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.format(start),
                      style: AbgText.bodyStrong.copyWith(
                        fontSize: 14,
                        color: AbgColors.navy,
                      ),
                    ),
                    Text(
                      l.aptMinutes(a.durationMinutes),
                      style: AbgText.caption,
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      a.subject,
                      style: AbgText.bodyStrong.copyWith(fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${a.requester.name} → ${a.host.name}',
                      style: AbgText.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (a.location != null && a.location!.isNotEmpty)
                      Text(
                        a.location!,
                        style: AbgText.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    if (a.status == 'PROPOSED') ...[
                      const SizedBox(height: 4),
                      AppointmentStatusChip(a.status, dense: true),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
