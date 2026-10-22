import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../core/session.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/brand.dart';
import '../../widgets/common.dart';
import 'visit_models.dart';
import 'visitor_form_screen.dart';
import 'visitor_widgets.dart';
import 'visitors_api.dart';

/// "My visitors" for every host; a live "Gate" tab for security and the front desk.
class VisitorsScreen extends StatelessWidget {
  const VisitorsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final profile = context.read<SessionController>().profile;
    final gate = profile?.can('visitor.manage') ?? false;
    final invite = profile?.can('visitor.invite') ?? false;
    final guard = profile?.roles.contains('SECURITY_GUARD') ?? false;
    final fab = invite
        ? FloatingActionButton.extended(
            heroTag: 'visitor-invite',
            onPressed: () => context.push('/visitors/new'),
            icon: const Icon(Icons.person_add_alt_1_rounded),
            label: Text(l.visInvite),
          )
        : null;
    if (!gate) {
      return Scaffold(
        appBar: AppBar(title: Text(l.visMyVisitors)),
        floatingActionButton: fab,
        body: const _MyVisitorsTab(),
      );
    }
    return DefaultTabController(
      length: 2,
      initialIndex: guard ? 1 : 0,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.visTitle),
          bottom: TabBar(
            tabs: [
              Tab(text: l.visMyVisitors),
              Tab(text: l.visGate),
            ],
          ),
        ),
        floatingActionButton: fab,
        body: const TabBarView(children: [_MyVisitorsTab(), _GateTab()]),
      ),
    );
  }
}

// ── My visitors (as host) ──

class _MyVisitorsTab extends StatefulWidget {
  const _MyVisitorsTab();

  @override
  State<_MyVisitorsTab> createState() => _MyVisitorsTabState();
}

class _MyVisitorsTabState extends State<_MyVisitorsTab>
    with AutomaticKeepAliveClientMixin {
  String _scope = 'upcoming';
  List<VisitRow> _items = [];
  String? _cursor;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  @override
  bool get wantKeepAlive => true;

  VisitorsApi get _api => VisitorsApi(context.read<ApiClient>());

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() => _loading = _items.isEmpty);
    try {
      final page = await _api.mine(scope: _scope);
      if (!mounted) return;
      setState(() {
        _items = page.items;
        _cursor = page.nextCursor;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => (_error = e, _loading = false));
    }
  }

  Future<void> _more() async {
    if (_cursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final page = await _api.mine(scope: _scope, cursor: _cursor);
      if (!mounted) return;
      setState(() {
        _items = [..._items, ...page.items];
        _cursor = page.nextCursor;
      });
    } catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _open(String path) async {
    await context.push(path);
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l = L.of(context);
    return RefreshIndicator(
      color: AbgColors.navy,
      onRefresh: _load,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.pixels > n.metrics.maxScrollExtent - 300) {
            unawaited(_more());
          }
          return false;
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            AbgSpace.gutter,
            12,
            AbgSpace.gutter,
            96,
          ),
          children: [
            Wrap(
              spacing: 8,
              children: [
                for (final (value, label) in [
                  ('upcoming', l.visUpcoming),
                  ('past', l.visPast),
                ])
                  ChoiceChip(
                    label: Text(label),
                    selected: _scope == value,
                    onSelected: (_) {
                      setState(() {
                        _scope = value;
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
                icon: Icons.badge_outlined,
                title: _scope == 'upcoming' ? l.visNoUpcoming : l.visNoPast,
                message: _scope == 'upcoming' ? l.visNoUpcomingHint : null,
                action: _scope == 'upcoming' ? l.visInvite : null,
                onAction: () => _open('/visitors/new'),
              )
            else
              for (final v in _items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: VisitCard(
                    visit: v,
                    onTap: () => _open('/visitors/${v.id}'),
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

// ── The gate ──

class _GateTab extends StatefulWidget {
  const _GateTab();

  @override
  State<_GateTab> createState() => _GateTabState();
}

class _GateTabState extends State<_GateTab> with AutomaticKeepAliveClientMixin {
  VisitSummary? _summary;
  List<VisitRow> _onSite = [];
  List<VisitRow> _expected = [];
  Object? _error;
  bool _loading = true;
  final _busy = <String>{};
  final _passNumber = TextEditingController();
  bool _looking = false;
  Timer? _timer;

  @override
  bool get wantKeepAlive => true;

  VisitorsApi get _api => VisitorsApi(context.read<ApiClient>());

  @override
  void initState() {
    super.initState();
    unawaited(_load());
    // The on-site count is live: refresh every 30 seconds.
    _timer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => unawaited(_load()),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _passNumber.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        _api.summary(),
        _api.board(status: 'CHECKED_IN'),
        _api.board(status: 'EXPECTED'),
      ]);
      if (!mounted) return;
      setState(() {
        _summary = results[0] as VisitSummary;
        _onSite = (results[1] as VisitPage).items;
        _expected = (results[2] as VisitPage).items;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => (_error = e, _loading = false));
    }
  }

  Future<void> _act(VisitRow v, String action) async {
    final l = L.of(context);
    setState(() => _busy.add(v.id));
    try {
      if (action == 'CHECK_IN') {
        await _api.checkIn(v.id);
        if (mounted) showSnack(context, l.visCheckedIn(v.visitorName));
      } else {
        await _api.checkOut(v.id);
        if (mounted) showSnack(context, l.visCheckedOut(v.visitorName));
      }
      await _load();
    } catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
      await _load();
    } finally {
      if (mounted) setState(() => _busy.remove(v.id));
    }
  }

  Future<void> _lookUp() async {
    final l = L.of(context);
    final number = _passNumber.text.trim();
    if (number.isEmpty) return;
    setState(() => _looking = true);
    try {
      final pass = await _api.passByNumber(number);
      if (!mounted) return;
      _passNumber.clear();
      if (pass.token != null) {
        await context.push('/visitors/pass/${pass.token}');
        if (mounted) unawaited(_load());
      }
    } on ApiException catch (e) {
      if (mounted) {
        showSnack(
          context,
          e.isNetwork ? l.errorNetwork : e.message,
          error: true,
        );
      }
    } finally {
      if (mounted) setState(() => _looking = false);
    }
  }

  Future<void> _walkIn() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const VisitorFormScreen(walkIn: true),
      ),
    );
    if (mounted) unawaited(_load());
  }

  Future<void> _open(String id) async {
    await context.push('/visitors/$id');
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l = L.of(context);
    final s = _summary;
    return RefreshIndicator(
      color: AbgColors.navy,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          12,
          AbgSpace.gutter,
          96,
        ),
        children: [
          if (_error != null && s == null)
            ErrorPanel(error: _error!, onRetry: _load)
          else ...[
            _OnSiteHero(
              summary: s,
              onScan: () async {
                await context.push('/scan');
                if (mounted) unawaited(_load());
              },
              onWalkIn: _walkIn,
              onLongest: s?.longestId == null
                  ? null
                  : () => _open(s!.longestId!),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _MiniStat(
                    label: l.visStatCheckedOut,
                    value: s?.checkedOutToday,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _MiniStat(
                    label: l.visStatWalkIns,
                    value: s?.walkInsToday,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _MiniStat(
                    label: l.visStatVisits,
                    value: s?.visitsToday,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SectionCard(
              padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
              child: Row(
                children: [
                  const Icon(Icons.pin_outlined, color: AbgColors.navy500),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _passNumber,
                      textCapitalization: TextCapitalization.characters,
                      textInputAction: TextInputAction.search,
                      onSubmitted: (_) => _lookUp(),
                      decoration: InputDecoration(
                        hintText: l.visPassNumberHint,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: l.visVerify,
                    onPressed: _looking ? null : _lookUp,
                    icon: _looking
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.arrow_forward_rounded),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SectionTitle(
              l.visOnSiteNow,
              trailing: Text('${_onSite.length}', style: AbgText.caption),
            ),
            if (_loading) ...[
              const SkeletonCard(),
              const SizedBox(height: 10),
            ] else if (_onSite.isEmpty)
              _Quiet(text: l.visNobodyOnSite)
            else
              for (final v in _onSite)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: VisitCard(
                    visit: v,
                    busy: _busy.contains(v.id),
                    onTap: () => _open(v.id),
                    onAction: (a) => _act(v, a),
                  ),
                ),
            const SizedBox(height: 12),
            SectionTitle(
              l.visExpectedToday,
              trailing: Text('${_expected.length}', style: AbgText.caption),
            ),
            if (_loading)
              const SkeletonCard()
            else if (_expected.isEmpty)
              _Quiet(text: l.visNobodyExpected)
            else
              for (final v in _expected)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: VisitCard(
                    visit: v,
                    busy: _busy.contains(v.id),
                    onTap: () => _open(v.id),
                    onAction: (a) => _act(v, a),
                  ),
                ),
          ],
        ],
      ),
    );
  }
}

class _OnSiteHero extends StatelessWidget {
  const _OnSiteHero({
    required this.summary,
    required this.onScan,
    required this.onWalkIn,
    required this.onLongest,
  });

  final VisitSummary? summary;
  final VoidCallback onScan;
  final VoidCallback onWalkIn;
  final VoidCallback? onLongest;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final s = summary;
    return HeroBackground(
      borderRadius: BorderRadius.circular(AbgRadii.xl),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 9,
                  height: 9,
                  decoration: const BoxDecoration(
                    color: AbgColors.success,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Overline(l.visLiveOnSite, color: AbgColors.platinum),
              ],
            ),
            const SizedBox(height: 8),
            Semantics(
              liveRegion: true,
              label: l.visOnSiteSemantics(s?.onSiteNow ?? 0),
              child: ExcludeSemantics(
                child: Text(
                  s == null ? '—' : '${s.onSiteNow}',
                  style: AbgText.hero.copyWith(
                    fontSize: 56,
                    color: Colors.white,
                    height: 1,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              s == null
                  ? l.visCounting
                  : '${l.visPeopleOnSite(s.peopleOnSite)} · ${l.visStillExpected(s.expectedToday)}',
              style: AbgText.small.copyWith(color: AbgColors.platinum),
            ),
            if (s != null && s.overstaying > 0) ...[
              const SizedBox(height: 6),
              Text(
                l.visOverstaying(s.overstaying),
                style: AbgText.small.copyWith(
                  color: AbgColors.pendingSoft,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            if (s?.longestName != null && s?.longestSince != null) ...[
              const SizedBox(height: 12),
              Material(
                color: Colors.white.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(AbgRadii.md),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AbgRadii.md),
                  onTap: onLongest,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.hourglass_bottom_rounded,
                          color: AbgColors.platinum,
                          size: 18,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            l.visLongest(
                              s!.longestName!,
                              duration(
                                DateTime.now().difference(s.longestSince!),
                              ),
                            ),
                            style: AbgText.small.copyWith(color: Colors.white),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const Icon(
                          Icons.chevron_right_rounded,
                          color: AbgColors.platinumDeep,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: PlatinumButton(
                    label: l.visScanPass,
                    icon: Icons.qr_code_scanner_rounded,
                    height: 50,
                    onPressed: onScan,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onWalkIn,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white38),
                      minimumSize: const Size(0, 50),
                    ),
                    icon: const Icon(Icons.directions_walk_rounded),
                    label: Text(l.visWalkInAction),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});
  final String label;
  final int? value;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value == null ? '—' : '$value',
            style: AbgText.h2.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          Text(
            label,
            style: AbgText.caption,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _Quiet extends StatelessWidget {
  const _Quiet({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(AbgRadii.lg),
      border: Border.all(color: AbgColors.border),
    ),
    child: Text(text, style: AbgText.small, textAlign: TextAlign.center),
  );
}
