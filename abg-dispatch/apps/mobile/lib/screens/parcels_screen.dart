import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/session.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import '../widgets/parcel_card.dart';
import '../widgets/sync_banner.dart';

class ParcelsScreen extends StatefulWidget {
  const ParcelsScreen({super.key});

  @override
  State<ParcelsScreen> createState() => _ParcelsScreenState();
}

class _ParcelsScreenState extends State<ParcelsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';

  List<(String, String)> _boxes(L l, bool courier) => [
    ('INCOMING', l.tabIncoming),
    ('OUTGOING', l.tabOutgoing),
    if (courier) ('ASSIGNED', l.tabAssigned),
    ('COMPLETED', l.tabCompleted),
  ];

  @override
  void initState() {
    super.initState();
    final courier =
        context.read<SessionController>().profile?.isCourier ?? false;
    _tabs = TabController(length: courier ? 4 : 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _search.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final courier =
        context.watch<SessionController>().profile?.isCourier ?? false;
    final boxes = _boxes(l, courier);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.navParcels),
        actions: [
          IconButton(
            tooltip: l.newParcel,
            onPressed: () => context.push('/create'),
            icon: const Icon(Icons.add_box_outlined),
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(112),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AbgSpace.gutter,
                  4,
                  AbgSpace.gutter,
                  8,
                ),
                child: TextField(
                  controller: _search,
                  textInputAction: TextInputAction.search,
                  onChanged: (v) {
                    _debounce?.cancel();
                    _debounce = Timer(
                      const Duration(milliseconds: 350),
                      () => setState(() => _query = v.trim()),
                    );
                  },
                  decoration: InputDecoration(
                    hintText: l.searchParcels,
                    prefixIcon: const Icon(Icons.search_rounded),
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    suffixIcon: _query.isEmpty
                        ? null
                        : IconButton(
                            tooltip: l.clear,
                            icon: const Icon(Icons.close_rounded),
                            onPressed: () {
                              _search.clear();
                              setState(() => _query = '');
                            },
                          ),
                  ),
                ),
              ),
              TabBar(
                controller: _tabs,
                tabs: boxes.map((b) => Tab(text: b.$2)).toList(),
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: boxes
            .map(
              (b) => _ParcelList(
                key: ValueKey('${b.$1}|$_query'),
                box: b.$1,
                query: _query,
              ),
            )
            .toList(),
      ),
    );
  }
}

class _ParcelList extends StatefulWidget {
  const _ParcelList({super.key, required this.box, required this.query});

  final String box;
  final String query;

  @override
  State<_ParcelList> createState() => _ParcelListState();
}

class _ParcelListState extends State<_ParcelList>
    with AutomaticKeepAliveClientMixin {
  final List<ParcelRow> _items = [];
  String? _cursor;
  bool _loading = true;
  bool _more = false;
  Object? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    unawaited(_load(reset: true));
  }

  Future<void> _load({bool reset = false}) async {
    final repo = context.read<DispatchRepository>();
    try {
      final page = await repo.parcels(
        box: widget.box,
        q: widget.query,
        cursor: reset ? null : _cursor,
      );
      if (!mounted) return;
      setState(() {
        if (reset) _items.clear();
        _items.addAll(page.items);
        _cursor = page.nextCursor;
        _more = page.nextCursor != null;
        _loading = false;
        _error = null;
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

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l = L.of(context);
    if (_loading) {
      return ListView(
        padding: const EdgeInsets.all(AbgSpace.gutter),
        children: const [
          SkeletonCard(),
          SizedBox(height: 10),
          SkeletonCard(),
          SizedBox(height: 10),
          SkeletonCard(),
        ],
      );
    }
    if (_error != null && _items.isEmpty) {
      return ErrorPanel(error: _error!, onRetry: () => _load(reset: true));
    }
    return RefreshIndicator(
      color: AbgColors.navy,
      onRefresh: () => _load(reset: true),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          14,
          AbgSpace.gutter,
          120,
        ),
        itemCount: _items.isEmpty ? 2 : _items.length + 1 + (_more ? 1 : 0),
        itemBuilder: (context, i) {
          if (i == 0) return const SyncBanner();
          if (_items.isEmpty) {
            return EmptyState(
              icon: widget.query.isEmpty
                  ? Icons.inventory_2_outlined
                  : Icons.search_off_rounded,
              title: widget.query.isEmpty ? l.noParcels : l.noMatches,
              message: widget.query.isEmpty ? l.noParcelsHint : null,
            );
          }
          final index = i - 1;
          if (index >= _items.length) {
            unawaited(_load());
            return const Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            );
          }
          final p = _items[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: ParcelCard(
              parcel: p,
              onTap: () async {
                await context.push('/parcels/${p.id}');
                if (mounted) unawaited(_load(reset: true));
              },
            ),
          );
        },
      ),
    );
  }
}
