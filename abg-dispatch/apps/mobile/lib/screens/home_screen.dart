import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/formatting.dart';
import '../core/services.dart';
import '../core/session.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';
import '../widgets/home_scene.dart';
import '../widgets/parcel_card.dart';
import '../widgets/sync_banner.dart';

/// Home: an illustrated navy header with the person's name and office, the
/// services grid (eight at a time, "See more" for the rest), notice banners,
/// an "at a glance" strip, and the parcels that need attention.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _NoticeBanner {
  _NoticeBanner(
    this.id,
    this.title,
    this.channel,
    this.urgent,
    this.pinned,
    this.at,
  );
  final String id;
  final String title;
  final String channel;
  final bool urgent;
  final bool pinned;
  final DateTime? at;
}

class _HomeScreenState extends State<HomeScreen> {
  ParcelSummary? _summary;
  List<ParcelRow> _attention = [];
  List<ParcelRow> _recent = [];
  List<_NoticeBanner> _notices = [];
  int? _openReports;
  int? _approvals;
  int? _unreadNotices;
  int _leaveToApprove = 0;
  int _meetingsToAnswer = 0;
  int _auditActions = 0;
  Object? _error;
  bool _loading = true;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    final repo = context.read<DispatchRepository>();
    final courier =
        context.read<SessionController>().profile?.isCourier ?? false;
    unawaited(_loadModules());
    try {
      final results = await Future.wait([
        repo.summary(),
        repo.parcels(box: 'INCOMING', view: 'PENDING_RECEIPT', limit: 4),
        if (courier)
          repo.parcels(box: 'ASSIGNED', limit: 4)
        else
          repo.parcels(box: 'OUTGOING', view: 'AWAITING_PICKUP', limit: 3),
        repo.parcels(box: 'ALL', limit: 3),
      ]);
      final waiting = (results[1] as PageOf<ParcelRow>).items;
      final other = (results[2] as PageOf<ParcelRow>).items;
      if (!mounted) return;
      setState(() {
        _summary = results[0] as ParcelSummary;
        _attention = [
          ...waiting,
          ...other.where((p) => !waiting.any((w) => w.id == p.id)),
        ].take(4).toList();
        _recent = (results[3] as PageOf<ParcelRow>).items;
        _error = null;
        _loading = false;
      });
      unawaited(context.read<NotificationBadge>().refresh());
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  /// Notices, approvals, reports, meetings to answer and audit actions for
  /// the banners, the tile badges and the glance strip.
  /// Each is optional: the home screen works without any of them.
  Future<void> _loadModules() async {
    final api = context.read<ApiClient>();
    final repo = context.read<DispatchRepository>();
    final profile = context.read<SessionController>().profile;
    bool can(String c) => profile?.can(c) ?? false;

    Future<T?> attempt<T>(Future<T> Function() f) async {
      try {
        return await f();
      } catch (_) {
        return null;
      }
    }

    int count(Object? body) => body is Map && body['items'] is List
        ? (body['items'] as List).length
        : 0;

    final results = await Future.wait<Object?>([
      if (can('notice.read'))
        attempt<Object?>(() => api.get('/notices', query: {'limit': '5'}))
      else
        Future.value(null),
      if (can('notice.read'))
        attempt<Object?>(() => api.get('/notices/unread-count'))
      else
        Future.value(null),
      attempt<Object?>(() => api.get('/tours/approvals')),
      attempt<Object?>(() => api.get('/pool-car/approvals')),
      if (can('incident.report'))
        attempt<Object?>(() => repo.myIncidents(state: 'open'))
      else
        Future.value(null),
      attempt<Object?>(() => api.get('/leave/approvals')),
      if (can('appointment.request'))
        attempt<Object?>(() => api.get('/appointments/inbox'))
      else
        Future.value(null),
      attempt<Object?>(() => api.get('/audits/actions/mine')),
    ]);
    if (!mounted) return;
    final notices = results[0];
    final unread = results[1];
    final tours = results[2];
    final cars = results[3];
    final reports = results[4];
    final leave = results[5];
    final meetings = results[6];
    final audits = results[7];
    setState(() {
      if (notices is Map && notices['items'] is List) {
        _notices = [
          for (final n in (notices['items'] as List).whereType<Map>())
            _NoticeBanner(
              n['id'].toString(),
              (n['title'] ?? '').toString(),
              (n['channel'] ?? '').toString(),
              n['urgent'] == true,
              n['pinned'] == true,
              DateTime.tryParse((n['publishedAt'] ?? '').toString()),
            ),
        ].take(4).toList();
      }
      if (unread is Map && unread['unread'] is num) {
        _unreadNotices = (unread['unread'] as num).toInt();
      }
      _leaveToApprove = count(leave);
      _meetingsToAnswer = count(meetings);
      if (audits is Map && audits['counts'] is Map) {
        final c = audits['counts'] as Map;
        _auditActions = (c['open'] as num? ?? 0).toInt();
      }
      if (tours != null || cars != null || leave != null || meetings != null) {
        _approvals =
            count(tours) + count(cars) + _leaveToApprove + _meetingsToAnswer;
      }
      if (reports is PageOf) _openReports = reports.items.length;
    });
  }

  Future<void> _go(String route) async {
    await context.push(route);
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final profile = context.watch<SessionController>().profile;
    final services = servicesFor(profile, l);
    final badges = <String, int>{
      'approvals': _approvals ?? 0,
      'notices': _unreadNotices ?? 0,
      'parcels': _summary?.waitingForMe ?? 0,
      'leave': _leaveToApprove,
      'appointments': _meetingsToAnswer,
      'audits': _auditActions,
    };

    return Scaffold(
      backgroundColor: AbgColors.white,
      body: RefreshIndicator(
        color: AbgColors.navy,
        onRefresh: _load,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: _HeaderWithServices(
                profile: profile,
                services: services,
                badges: badges,
                expanded: _expanded,
                onToggle: () => setState(() => _expanded = !_expanded),
                onOpen: _go,
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(0, 6, 0, 28),
              sliver: SliverList.list(
                children: [
                  _BannerCarousel(notices: _notices, onOpen: _go),
                  const SizedBox(height: 22),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AbgSpace.gutter,
                    ),
                    child: SectionTitle(l.homeGlance),
                  ),
                  _GlanceStrip(
                    profile: profile,
                    summary: _summary,
                    approvals: _approvals,
                    openReports: _openReports,
                    unreadNotices: _unreadNotices,
                    onOpen: _go,
                  ),
                  const SizedBox(height: 22),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AbgSpace.gutter,
                    ),
                    child: _ParcelSection(
                      loading: _loading,
                      error: _error,
                      attention: _attention,
                      recent: _recent,
                      onRetry: _load,
                      onOpen: (id) => _go('/parcels/$id'),
                      onSeeAll: () => _go('/parcels'),
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

/// The illustrated header and the white sheet of services that overlaps it.
class _HeaderWithServices extends StatelessWidget {
  const _HeaderWithServices({
    required this.profile,
    required this.services,
    required this.badges,
    required this.expanded,
    required this.onToggle,
    required this.onOpen,
  });

  final Profile? profile;
  final List<AbgService> services;
  final Map<String, int> badges;
  final bool expanded;
  final VoidCallback onToggle;
  final void Function(String route) onOpen;

  static const _overlap = 30.0;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    final headerHeight = top + 196;
    return Stack(
      children: [
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          child: const HomeScene(child: SizedBox.expand()),
        ),
        Padding(
          padding: EdgeInsets.only(top: headerHeight - _overlap),
          child: _ServicesSheet(
            services: services,
            badges: badges,
            expanded: expanded,
            onToggle: onToggle,
            onOpen: onOpen,
          ),
        ),
        Positioned(
          top: top + 14,
          left: AbgSpace.gutter,
          right: AbgSpace.gutter,
          child: _HeaderBar(
            profile: profile,
            services: services,
            onOpen: onOpen,
          ),
        ),
      ],
    );
  }
}

class _HeaderBar extends StatelessWidget {
  const _HeaderBar({
    required this.profile,
    required this.services,
    required this.onOpen,
  });

  final Profile? profile;
  final List<AbgService> services;
  final void Function(String route) onOpen;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final e = profile?.employee;
    // The office, where a wallet app would show the balance.
    final role = e?.branch ?? e?.designation ?? '';
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(2.5),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: AbgGradients.platinum,
            boxShadow: [
              BoxShadow(
                color: Color(0x66000000),
                blurRadius: 14,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: Avatar(initials: e?.initials ?? '?', size: 54),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                profile?.displayName ?? '',
                style: AbgText.h3.copyWith(color: Colors.white, fontSize: 18),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 7),
              if (role.isNotEmpty)
                Container(
                  padding: const EdgeInsets.fromLTRB(4, 4, 12, 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AbgGradients.hero,
                        ),
                        child: const Icon(
                          Icons.apartment_rounded,
                          size: 14,
                          color: AbgColors.platinumBright,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          role,
                          style: AbgText.small.copyWith(
                            color: AbgColors.navy,
                            fontWeight: FontWeight.w600,
                            fontSize: 12.5,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        _RoundButton(
          tooltip: l.homeSearchTooltip,
          onTap: () => _searchServices(context, services, onOpen),
          child: const Icon(
            Icons.search_rounded,
            color: AbgColors.navy,
            size: 26,
          ),
        ),
        const SizedBox(width: 10),
        _RoundButton(
          tooltip: l.homeMenuTooltip,
          onTap: () => StatefulNavigationShell.maybeOf(context)?.goBranch(1),
          dark: true,
          corner: const Icon(
            Icons.menu_rounded,
            size: 11,
            color: AbgColors.navy,
          ),
          child: const Padding(
            padding: EdgeInsets.all(9),
            child: AbgLogo(width: 34, markOnly: true),
          ),
        ),
      ],
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.child,
    required this.onTap,
    required this.tooltip,
    this.dark = false,
    this.corner,
  });

  final Widget child;
  final VoidCallback onTap;
  final String tooltip;
  final bool dark;
  final Widget? corner;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        label: tooltip,
        child: GestureDetector(
          onTap: onTap,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: dark ? null : Colors.white,
                  gradient: dark ? AbgGradients.hero : null,
                  border: Border.all(
                    color: dark ? AbgColors.platinum : Colors.white,
                    width: dark ? 2 : 0,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x55000000),
                      blurRadius: 14,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: ExcludeSemantics(child: child),
              ),
              if (corner != null)
                Positioned(
                  right: -1,
                  bottom: -1,
                  child: Container(
                    width: 20,
                    height: 20,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AbgColors.platinumBright,
                      border: Border.all(color: AbgColors.borderStrong),
                    ),
                    child: corner,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ServicesSheet extends StatelessWidget {
  const _ServicesSheet({
    required this.services,
    required this.badges,
    required this.expanded,
    required this.onToggle,
    required this.onOpen,
  });

  final List<AbgService> services;
  final Map<String, int> badges;
  final bool expanded;
  final VoidCallback onToggle;
  final void Function(String route) onOpen;

  static const _perRow = 4;
  static const _visible = 8;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final rows = <List<AbgService>>[
      for (var i = 0; i < services.length; i += _perRow)
        services.sublist(i, (i + _perRow).clamp(0, services.length)),
    ];
    final hasMore = services.length > _visible;
    final shown = expanded || !hasMore
        ? rows
        : rows.take(_visible ~/ _perRow).toList();
    final teaser = !expanded && hasMore ? rows[_visible ~/ _perRow] : null;

    Widget row(List<AbgService> items) => Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < _perRow; i++)
            Expanded(
              child: i < items.length
                  ? _ServiceTile(
                      service: items[i],
                      badge: badges[items[i].id] ?? 0,
                      onTap: () => onOpen(items[i].route),
                    )
                  : const SizedBox.shrink(),
            ),
        ],
      ),
    );

    return Container(
      decoration: const BoxDecoration(
        color: AbgColors.white,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AbgRadii.sheet),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(10, 26, 10, 0),
      child: Column(
        children: [
          ...shown.map(row),
          if (teaser != null)
            SizedBox(
              height: 64,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned.fill(
                    child: IgnorePointer(
                      child: ExcludeSemantics(
                        child: ClipRect(
                          child: ShaderMask(
                            shaderCallback: (r) => const LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Color(0x55FFFFFF), Color(0x00FFFFFF)],
                            ).createShader(r),
                            blendMode: BlendMode.dstIn,
                            child: OverflowBox(
                              alignment: Alignment.topCenter,
                              maxHeight: 120,
                              child: row(teaser),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Align(
                    alignment: const Alignment(0, -0.1),
                    child: _MorePill(
                      label: l.homeSeeMore,
                      icon: Icons.keyboard_arrow_down_rounded,
                      onTap: onToggle,
                    ),
                  ),
                ],
              ),
            ),
          if (expanded && hasMore)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _MorePill(
                label: l.homeSeeLess,
                icon: Icons.keyboard_arrow_up_rounded,
                onTap: onToggle,
              ),
            ),
        ],
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({
    required this.service,
    required this.onTap,
    this.badge = 0,
  });

  final AbgService service;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    final accent = service.accent;
    return Semantics(
      button: true,
      label: badge > 0 ? '${service.label}, $badge' : service.label,
      child: InkWell(
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        onTap: onTap,
        child: ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
            child: Column(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 62,
                      height: 62,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Color.alphaBlend(
                              accent.withValues(alpha: 0.06),
                              AbgColors.surface,
                            ),
                            Color.alphaBlend(
                              accent.withValues(alpha: 0.14),
                              AbgColors.softSilver,
                            ),
                          ],
                        ),
                        border: Border.all(
                          color: accent.withValues(alpha: 0.12),
                        ),
                      ),
                      child: Icon(service.icon, color: accent, size: 28),
                    ),
                    if (badge > 0)
                      Positioned(
                        right: -2,
                        top: -2,
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 20),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 5,
                            vertical: 1,
                          ),
                          decoration: BoxDecoration(
                            color: AbgColors.danger,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: Text(
                            badge > 99 ? '99+' : '$badge',
                            textAlign: TextAlign.center,
                            style: AbgText.caption.copyWith(
                              color: Colors.white,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 9),
                Text(
                  service.label,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AbgText.small.copyWith(
                    color: AbgColors.ink,
                    fontSize: 12.5,
                    height: 1.25,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MorePill extends StatelessWidget {
  const _MorePill({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: StadiumBorder(side: BorderSide(color: AbgColors.border)),
      elevation: 3,
      shadowColor: const Color(0x22000000),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 10, 12, 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: AbgText.bodyStrong.copyWith(
                  color: AbgColors.navy,
                  fontSize: 14,
                ),
              ),
              const SizedBox(width: 4),
              Icon(icon, color: AbgColors.navy, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}

class _Banner {
  const _Banner({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.route,
    required this.action,
    this.tag,
    this.urgent = false,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final String route;
  final String action;
  final String? tag;
  final bool urgent;
}

/// Notice-board highlights (urgent and pinned first), then feature tips.
class _BannerCarousel extends StatefulWidget {
  const _BannerCarousel({required this.notices, required this.onOpen});

  final List<_NoticeBanner> notices;
  final void Function(String route) onOpen;

  @override
  State<_BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<_BannerCarousel> {
  final _controller = PageController();
  Timer? _timer;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted || !_controller.hasClients) return;
      final count = _count;
      if (count < 2) return;
      unawaited(
        _controller.animateToPage(
          (_page + 1) % count,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeOutCubic,
        ),
      );
    });
  }

  int _count = 0;

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  String _channel(L l, String c) => switch (c) {
    'CHAIRMAN' => l.homeChannelCHAIRMAN,
    'MANAGING_DIRECTOR' => l.homeChannelMANAGING_DIRECTOR,
    'HR' => l.homeChannelHR,
    'ADMINISTRATION' => l.homeChannelADMINISTRATION,
    'COMPLIANCE' => l.homeChannelCOMPLIANCE,
    'IT' => l.homeChannelIT,
    _ => c,
  };

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final locale = Localizations.localeOf(context).languageCode;
    final profile = context.read<SessionController>().profile;
    bool can(String c) => profile?.can(c) ?? false;
    final banners = <_Banner>[
      for (final n in widget.notices)
        _Banner(
          title: n.title,
          subtitle: [
            _channel(l, n.channel),
            if (n.at != null) dayAndTime(n.at!, locale),
          ].join(' · '),
          icon: n.urgent ? Icons.priority_high_rounded : Icons.campaign_rounded,
          route: '/notices/${n.id}',
          action: l.bannerRead,
          tag: n.urgent ? l.bannerUrgent : (n.pinned ? l.bannerPinned : null),
          urgent: n.urgent,
        ),
      if (can('fleet.request'))
        _Banner(
          title: l.promoCarTitle,
          subtitle: l.promoCarBody,
          icon: Icons.directions_car_filled_rounded,
          route: '/pool-car/new',
          action: l.bannerStart,
        ),
      if (can('incident.report'))
        _Banner(
          title: l.promoIssueTitle,
          subtitle: l.promoIssueBody,
          icon: Icons.add_a_photo_rounded,
          route: '/incidents/new',
          action: l.bannerStart,
        ),
      if (can('visitor.invite'))
        _Banner(
          title: l.promoVisitorTitle,
          subtitle: l.promoVisitorBody,
          icon: Icons.badge_rounded,
          route: '/visitors/new',
          action: l.bannerStart,
        ),
    ];
    _count = banners.length;
    if (banners.isEmpty) return const SizedBox.shrink();
    if (_page >= banners.length) _page = 0;
    return Column(
      children: [
        SizedBox(
          height: 138,
          child: PageView.builder(
            controller: _controller,
            itemCount: banners.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (_, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: AbgSpace.gutter),
              child: _BannerCard(
                banner: banners[i],
                onTap: () => widget.onOpen(banners[i].route),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < banners.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _page ? 18 : 7,
                height: 7,
                decoration: BoxDecoration(
                  color: i == _page ? AbgColors.navy : AbgColors.borderStrong,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _BannerCard extends StatelessWidget {
  const _BannerCard({required this.banner, required this.onTap});

  final _Banner banner;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '${banner.tag != null ? '${banner.tag}: ' : ''}${banner.title}',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AbgRadii.xl),
        child: Material(
          child: Ink(
            decoration: const BoxDecoration(gradient: AbgGradients.hero),
            child: InkWell(
              onTap: onTap,
              child: Stack(
                children: [
                  Positioned(
                    right: -30,
                    top: -40,
                    child: _Ring(
                      size: 150,
                      alpha: banner.urgent ? 0.14 : 0.08,
                      color: banner.urgent
                          ? AbgColors.danger
                          : AbgColors.platinum,
                    ),
                  ),
                  Positioned(
                    right: 40,
                    bottom: -60,
                    child: _Ring(
                      size: 120,
                      alpha: 0.06,
                      color: AbgColors.platinum,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 16, 14, 14),
                    child: Row(
                      children: [
                        Expanded(
                          child: ExcludeSemantics(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (banner.tag != null)
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 7),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: banner.urgent
                                          ? AbgColors.danger
                                          : Colors.white.withValues(
                                              alpha: 0.14,
                                            ),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      banner.tag!.toUpperCase(),
                                      style: AbgText.caption.copyWith(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                  ),
                                Text(
                                  banner.title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: AbgText.h3.copyWith(
                                    color: Colors.white,
                                    fontSize: 16.5,
                                    height: 1.25,
                                  ),
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  banner.subtitle,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: AbgText.caption.copyWith(
                                    color: AbgColors.platinum,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: AbgGradients.platinum,
                                boxShadow: AbgShadows.raised,
                              ),
                              child: Icon(
                                banner.icon,
                                color: banner.urgent
                                    ? AbgColors.danger
                                    : AbgColors.navy,
                                size: 27,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                banner.action,
                                style: AbgText.caption.copyWith(
                                  color: AbgColors.navy,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Ring extends StatelessWidget {
  const _Ring({required this.size, required this.alpha, required this.color});
  final double size;
  final double alpha;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      border: Border.all(color: color.withValues(alpha: alpha), width: 18),
    ),
  );
}

class _Glance {
  const _Glance(this.label, this.value, this.icon, this.color, this.route);
  final String label;
  final int? value;
  final IconData icon;
  final Color color;
  final String route;
}

class _GlanceStrip extends StatelessWidget {
  const _GlanceStrip({
    required this.profile,
    required this.summary,
    required this.approvals,
    required this.openReports,
    required this.unreadNotices,
    required this.onOpen,
  });

  final Profile? profile;
  final ParcelSummary? summary;
  final int? approvals;
  final int? openReports;
  final int? unreadNotices;
  final void Function(String route) onOpen;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    bool can(String c) => profile?.can(c) ?? false;
    final items = <_Glance>[
      if (can('parcel.view.own')) ...[
        _Glance(
          l.glanceWaiting,
          summary?.waitingForMe,
          Icons.pending_actions_rounded,
          AbgColors.pending,
          '/parcels',
        ),
        _Glance(
          l.glanceInTransit,
          summary?.inTransit,
          Icons.local_shipping_rounded,
          AbgColors.active,
          '/parcels',
        ),
      ],
      _Glance(
        l.glanceApprovals,
        approvals,
        Icons.fact_check_rounded,
        const Color(0xFFC0466A),
        '/approvals',
      ),
      if (can('incident.report'))
        _Glance(
          l.glanceReports,
          openReports,
          Icons.assignment_rounded,
          AbgColors.danger,
          '/incidents',
        ),
      if (can('notice.read'))
        _Glance(
          l.glanceNotices,
          unreadNotices,
          Icons.newspaper_rounded,
          AbgColors.success,
          '/notices',
        ),
    ];
    return SizedBox(
      height: 84,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AbgSpace.gutter),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) {
          final g = items[i];
          return Semantics(
            button: true,
            label: '${g.label}: ${g.value ?? 0}',
            child: Material(
              color: AbgColors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AbgRadii.lg),
                side: const BorderSide(color: AbgColors.border),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(AbgRadii.lg),
                onTap: () => onOpen(g.route),
                child: ExcludeSemantics(
                  child: Container(
                    width: 156,
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: g.color.withValues(alpha: 0.10),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(g.icon, color: g.color, size: 21),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              g.value == null
                                  ? const Skeleton(width: 22, height: 18)
                                  : Text(
                                      '${g.value}',
                                      style: AbgText.h2.copyWith(
                                        fontSize: 20,
                                        height: 1.1,
                                      ),
                                    ),
                              const SizedBox(height: 2),
                              Text(
                                g.label,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: AbgText.caption.copyWith(
                                  fontSize: 11.5,
                                  height: 1.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ParcelSection extends StatelessWidget {
  const _ParcelSection({
    required this.loading,
    required this.error,
    required this.attention,
    required this.recent,
    required this.onRetry,
    required this.onOpen,
    required this.onSeeAll,
  });

  final bool loading;
  final Object? error;
  final List<ParcelRow> attention;
  final List<ParcelRow> recent;
  final Future<void> Function() onRetry;
  final void Function(String id) onOpen;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    if (error != null) return ErrorPanel(error: error!, onRetry: onRetry);
    final items = [
      ...attention,
      ...recent.where((r) => !attention.any((a) => a.id == r.id)),
    ].take(4).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SyncBanner(),
        SectionTitle(
          attention.isNotEmpty ? l.actionRequired : l.homeParcelsSection,
          action: l.seeAll,
          onAction: onSeeAll,
        ),
        if (loading) ...[
          const SkeletonCard(),
          const SizedBox(height: 10),
          const SkeletonCard(),
        ] else if (items.isEmpty)
          SectionCard(
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AbgColors.successSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.task_alt_rounded,
                    color: AbgColors.success,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l.allCaughtUp, style: AbgText.bodyStrong),
                      Text(l.nothingWaiting, style: AbgText.small),
                    ],
                  ),
                ),
              ],
            ),
          )
        else
          ...items.map(
            (p) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ParcelCard(parcel: p, onTap: () => onOpen(p.id)),
            ),
          ),
      ],
    );
  }
}

/// Bottom sheet: find a service by name, or jump to parcel search.
Future<void> _searchServices(
  BuildContext context,
  List<AbgService> services,
  void Function(String route) onOpen,
) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AbgColors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AbgRadii.sheet)),
    ),
    builder: (ctx) => _ServiceSearch(
      services: services,
      onOpen: (route) {
        Navigator.of(ctx).pop();
        onOpen(route);
      },
    ),
  );
}

class _ServiceSearch extends StatefulWidget {
  const _ServiceSearch({required this.services, required this.onOpen});
  final List<AbgService> services;
  final void Function(String route) onOpen;

  @override
  State<_ServiceSearch> createState() => _ServiceSearchState();
}

class _ServiceSearchState extends State<_ServiceSearch> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final matches = widget.services.where((s) => s.matches(_query)).toList();
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AbgSpace.gutter,
        12,
        AbgSpace.gutter,
        16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AbgColors.borderStrong,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            autofocus: true,
            onChanged: (v) => setState(() => _query = v),
            decoration: InputDecoration(
              hintText: l.homeSearchHint,
              prefixIcon: const Icon(Icons.search_rounded),
            ),
          ),
          const SizedBox(height: 10),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.5,
            ),
            child: ListView(
              shrinkWrap: true,
              children: [
                for (final s in matches)
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                    leading: CircleAvatar(
                      backgroundColor: s.accent.withValues(alpha: 0.10),
                      child: Icon(s.icon, color: s.accent, size: 21),
                    ),
                    title: Text(s.label, style: AbgText.bodyStrong),
                    trailing: const Icon(
                      Icons.chevron_right_rounded,
                      color: AbgColors.borderStrong,
                    ),
                    onTap: () => widget.onOpen(s.route),
                  ),
                if (matches.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    child: Text(
                      l.homeSearchEmpty(_query),
                      textAlign: TextAlign.center,
                      style: AbgText.small,
                    ),
                  ),
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                  leading: const CircleAvatar(
                    backgroundColor: AbgColors.platinumBright,
                    child: Icon(
                      Icons.manage_search_rounded,
                      color: AbgColors.navy,
                      size: 21,
                    ),
                  ),
                  title: Text(l.homeSearchParcels, style: AbgText.bodyStrong),
                  onTap: () => widget.onOpen('/parcels'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
