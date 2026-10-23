import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../core/session.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'fleet_models.dart';
import 'fleet_widgets.dart';
import 'trip_actions.dart';

enum _Tab { mine, approve, trips }

/// My pool car requests, the ones waiting for my approval, and — for
/// drivers — the trips I am driving.
class PoolCarScreen extends StatefulWidget {
  const PoolCarScreen({super.key});

  @override
  State<PoolCarScreen> createState() => _PoolCarScreenState();
}

class _PoolCarScreenState extends State<PoolCarScreen> {
  _Tab _tab = _Tab.mine;
  String _state = 'all';
  List<CarRow> _mine = [];
  String? _cursor;
  List<CarRow> _approvals = [];
  List<CarRow> _trips = [];
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;
  final _scroll = ScrollController();

  bool get _driver =>
      context.read<SessionController>().profile?.can('fleet.drive') ?? false;
  bool get _canRequest =>
      context.read<SessionController>().profile?.can('fleet.request') ?? false;
  FleetApi get _api => FleetApi(context.read<ApiClient>());

  @override
  void initState() {
    super.initState();
    // Drivers land on their trips; everyone else on their own requests.
    if (_driver && !_canRequest) _tab = _Tab.trips;
    unawaited(_load());
    _scroll.addListener(() {
      if (_tab == _Tab.mine &&
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
    setState(() => _loading = _mine.isEmpty && _trips.isEmpty);
    try {
      final api = _api;
      final results = await Future.wait([
        _canRequest
            ? api.mine(state: _state)
            : Future.value(const CarPage([], null)),
        api.approvals(),
        _driver ? api.trips() : Future.value(const CarPage([], null)),
      ]);
      if (!mounted) return;
      setState(() {
        _mine = results[0].items;
        _cursor = results[0].nextCursor;
        _approvals = results[1].items;
        _trips = results[2].items;
        _error = null;
        _loading = false;
        if (_tab == _Tab.approve && _approvals.isEmpty) _tab = _Tab.mine;
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
        _mine = [..._mine, ...page.items];
        _cursor = page.nextCursor;
      });
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _open(String id) async {
    await context.push('/pool-car/$id');
    if (mounted) unawaited(_load());
  }

  Future<void> _request() async {
    await context.push('/pool-car/new');
    if (mounted) unawaited(_load());
  }

  Future<void> _tripAction(CarRow row) async {
    final l = L.of(context);
    final action = row.status == 'ASSIGNED' ? 'start' : 'complete';
    final km = await askOdometer(
      context,
      title: action == 'start' ? l.pcStartTitle : l.pcCompleteTitle,
      confirm: action == 'start' ? l.pcStart : l.pcComplete,
    );
    if (km == null || !mounted) return;
    try {
      await _api.act(row.id, action, {
        'odometerKm': ?km.value,
      }, const Uuid().v4());
      if (!mounted) return;
      showSnack(context, action == 'start' ? l.pcStarted : l.pcCompleted);
      unawaited(_load());
    } on ApiException catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final tabs = <(_Tab, String, int?)>[
      if (_canRequest) (_Tab.mine, l.pcTabMine, null),
      if (_approvals.isNotEmpty)
        (_Tab.approve, l.pcTabApprove, _approvals.length),
      if (_driver) (_Tab.trips, l.pcTabTrips, _trips.length),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(l.pcTitle)),
      floatingActionButton: _canRequest && _tab == _Tab.mine
          ? FloatingActionButton.extended(
              onPressed: _request,
              backgroundColor: AbgColors.navy,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_road_rounded),
              label: Text(l.pcRequestCar),
            )
          : null,
      body: RefreshIndicator(
        color: AbgColors.navy,
        onRefresh: _load,
        child: ListView(
          controller: _scroll,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            AbgSpace.gutter,
            4,
            AbgSpace.gutter,
            96,
          ),
          children: [
            if (tabs.length > 1) ...[
              SegmentedButton<_Tab>(
                showSelectedIcon: false,
                segments: [
                  for (final (tab, label, count) in tabs)
                    ButtonSegment(
                      value: tab,
                      label: Text(
                        count != null && count > 0 ? '$label · $count' : label,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                selected: {_tab},
                onSelectionChanged: (s) => setState(() => _tab = s.first),
              ),
              const SizedBox(height: 14),
            ],
            if (_tab == _Tab.mine) ...[
              Wrap(
                spacing: 8,
                children: [
                  for (final (value, label) in [
                    ('all', l.pcFilterAll),
                    ('open', l.pcFilterOpen),
                    ('closed', l.pcFilterClosed),
                  ])
                    ChoiceChip(
                      label: Text(label),
                      selected: _state == value,
                      onSelected: (_) {
                        setState(() {
                          _state = value;
                          _mine = [];
                        });
                        unawaited(_load());
                      },
                    ),
                ],
              ),
              const SizedBox(height: 12),
            ],
            if (_loading) ...[
              const SkeletonCard(),
              const SizedBox(height: 10),
              const SkeletonCard(),
            ] else if (_error != null)
              ErrorPanel(error: _error!, onRetry: _load)
            else
              ..._body(l),
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

  List<Widget> _body(L l) {
    final (items, empty) = switch (_tab) {
      _Tab.mine => (
        _mine,
        EmptyState(
          icon: Icons.directions_car_outlined,
          title: l.pcNoRequests,
          message: l.pcNoRequestsHint,
          action: l.pcRequestCar,
          onAction: _request,
        ),
      ),
      _Tab.approve => (
        _approvals,
        EmptyState(
          icon: Icons.how_to_reg_outlined,
          title: l.pcNoApprovals,
          message: l.pcNoApprovalsHint,
        ),
      ),
      _Tab.trips => (
        _trips,
        EmptyState(
          icon: Icons.route_outlined,
          title: l.pcNoTrips,
          message: l.pcNoTripsHint,
        ),
      ),
    };
    if (items.isEmpty) return [empty];
    return [
      for (final row in items)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: CarRequestCard(
            row: row,
            onTap: () => _open(row.id),
            subtitle: switch (_tab) {
              _Tab.approve => [
                row.requesterName,
                ?row.requesterDesignation,
                relative(row.createdAt, l),
              ].join(' · '),
              _ =>
                row.registrationNumber != null
                    ? '${row.vehicleName} · ${row.registrationNumber} · ${row.driverName}'
                    : null,
            },
            trailing: _tab == _Tab.trips && carOpenStatuses.contains(row.status)
                ? FilledButton.icon(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, kMinTap),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    onPressed: () => _tripAction(row),
                    icon: Icon(
                      row.status == 'ASSIGNED'
                          ? Icons.play_arrow_rounded
                          : Icons.flag_rounded,
                      size: 18,
                    ),
                    label: Text(
                      row.status == 'ASSIGNED' ? l.pcStart : l.pcComplete,
                    ),
                  )
                : null,
          ),
        ),
    ];
  }
}
