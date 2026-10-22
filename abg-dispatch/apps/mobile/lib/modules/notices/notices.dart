/// Official notice board: read, open attachments, acknowledge.
///
/// The router imports these screens from this file; each module may split its
/// code into more files in this folder and re-export them here.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../models/models.dart' show Json;
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/brand.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';

DateTime? _date(dynamic v) =>
    v is String && v.isNotEmpty ? DateTime.tryParse(v) : null;

// ─── Models ──────────────────────────────────────────────────────────────────

/// One notice on the board (GET /notices).
class NoticeRow {
  NoticeRow({
    required this.id,
    required this.referenceNumber,
    required this.title,
    required this.excerpt,
    required this.channel,
    required this.category,
    this.urgent = false,
    this.pinned = false,
    this.signedBy,
    this.publishedAt,
    this.hasAttachment = false,
    this.requiresAcknowledgement = false,
    this.read = false,
    this.acknowledged = false,
    this.awaitingAcknowledgement = false,
  });

  final String id;
  final String referenceNumber;
  final String title;
  final String excerpt;
  final String channel;
  final String category;
  final bool urgent;
  final bool pinned;
  final String? signedBy;
  final DateTime? publishedAt;
  final bool hasAttachment;
  final bool requiresAcknowledgement;
  final bool read;
  final bool acknowledged;
  final bool awaitingAcknowledgement;

  factory NoticeRow.fromJson(Json j) => NoticeRow(
    id: j['id'] as String,
    referenceNumber: (j['referenceNumber'] as String?) ?? '',
    title: (j['title'] as String?) ?? '',
    excerpt: (j['excerpt'] as String?) ?? '',
    channel: (j['channel'] as String?) ?? '',
    category: (j['category'] as String?) ?? 'GENERAL',
    urgent: j['urgent'] == true,
    pinned: j['pinned'] == true,
    signedBy: j['signedBy'] as String?,
    publishedAt: _date(j['publishedAt']),
    hasAttachment: j['hasAttachment'] == true,
    requiresAcknowledgement: j['requiresAcknowledgement'] == true,
    read: j['read'] == true,
    acknowledged: j['acknowledged'] == true,
    awaitingAcknowledgement: j['awaitingAcknowledgement'] == true,
  );
}

class NoticeAttachment {
  const NoticeAttachment({
    required this.name,
    required this.sizeBytes,
    required this.url,
  });
  final String name;
  final int sizeBytes;

  /// Signed for ten minutes; refresh the notice before opening it.
  final String url;
}

/// One notice in full (GET /notices/:id).
class NoticeDetail {
  NoticeDetail(this._j);
  final Json _j;

  String get id => _j['id'] as String;
  String get referenceNumber => (_j['referenceNumber'] as String?) ?? '';
  String get title => (_j['title'] as String?) ?? '';
  String get body => (_j['body'] as String?) ?? '';
  String get channel => (_j['channel'] as String?) ?? '';
  String get category => (_j['category'] as String?) ?? 'GENERAL';
  String get status => (_j['status'] as String?) ?? 'PUBLISHED';
  bool get urgent => _j['urgent'] == true;
  bool get pinned => _j['pinned'] == true;
  bool get expired => _j['expired'] == true;
  bool get toEveryone => _j['audience'] != 'BRANCHES';
  List<String> get offices => [
    for (final b in (_j['branches'] as List? ?? const []))
      ((b as Json)['name'] as String?) ?? '',
  ];
  bool get requiresAcknowledgement => _j['requiresAcknowledgement'] == true;
  String? get signedBy => _j['signedBy'] as String?;
  String get authorName => ((_j['author'] as Json?)?['name'] as String?) ?? '';
  DateTime? get publishedAt => _date(_j['publishedAt']);
  DateTime? get expiresAt => _date(_j['expiresAt']);
  bool get acknowledged => _j['acknowledged'] == true;
  DateTime? get acknowledgedAt =>
      _date((_j['receipt'] as Json?)?['acknowledgedAt']);
  NoticeAttachment? get attachment {
    final a = _j['attachment'] as Json?;
    if (a == null) return null;
    return NoticeAttachment(
      name: (a['name'] as String?) ?? 'notice.pdf',
      sizeBytes: (a['sizeBytes'] as num?)?.toInt() ?? 0,
      url: a['url'] as String,
    );
  }

  Json get _viewer => (_j['viewer'] as Json?) ?? const {};
  bool get isAuthor => _viewer['isAuthor'] == true;
  List<String> get actions => [
    for (final a in (_viewer['actions'] as List? ?? const [])) a as String,
  ];
  bool can(String action) => actions.contains(action);
}

class NoticeCounts {
  const NoticeCounts({
    this.unread = 0,
    this.toAcknowledge = 0,
    this.urgentUnread = 0,
  });
  final int unread;
  final int toAcknowledge;
  final int urgentUnread;

  factory NoticeCounts.fromJson(Json j) => NoticeCounts(
    unread: (j['unread'] as num?)?.toInt() ?? 0,
    toAcknowledge: (j['toAcknowledge'] as num?)?.toInt() ?? 0,
    urgentUnread: (j['urgentUnread'] as num?)?.toInt() ?? 0,
  );
}

// ─── Vocabulary ──────────────────────────────────────────────────────────────

const noticeChannels = [
  'CHAIRMAN',
  'MANAGING_DIRECTOR',
  'HR',
  'ADMINISTRATION',
  'COMPLIANCE',
  'IT',
];

String noticeChannelLabel(L l, String c) => switch (c) {
  'CHAIRMAN' => l.nbChannelCHAIRMAN,
  'MANAGING_DIRECTOR' => l.nbChannelMANAGING_DIRECTOR,
  'HR' => l.nbChannelHR,
  'ADMINISTRATION' => l.nbChannelADMINISTRATION,
  'COMPLIANCE' => l.nbChannelCOMPLIANCE,
  'IT' => l.nbChannelIT,
  _ => c,
};

String noticeCategoryLabel(L l, String c) => switch (c) {
  'CIRCULAR' => l.nbCatCIRCULAR,
  'POLICY' => l.nbCatPOLICY,
  'HR' => l.nbCatHR,
  'SAFETY' => l.nbCatSAFETY,
  'EVENT' => l.nbCatEVENT,
  'HOLIDAY' => l.nbCatHOLIDAY,
  _ => l.nbCatGENERAL,
};

IconData noticeChannelIcon(String c) => switch (c) {
  'CHAIRMAN' => Icons.workspace_premium_outlined,
  'MANAGING_DIRECTOR' => Icons.account_balance_outlined,
  'HR' => Icons.groups_2_outlined,
  'ADMINISTRATION' => Icons.apartment_rounded,
  'COMPLIANCE' => Icons.verified_user_outlined,
  'IT' => Icons.memory_rounded,
  _ => Icons.campaign_outlined,
};

bool _executive(String c) => c == 'CHAIRMAN' || c == 'MANAGING_DIRECTOR';

/// Blank lines separate paragraphs, as the author typed them.
List<String> noticeParagraphs(String body) => body
    .replaceAll('\r\n', '\n')
    .split(RegExp(r'\n\s*\n'))
    .map((p) => p.trim())
    .where((p) => p.isNotEmpty)
    .toList();

String _fileSize(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).round()} KB';
  return '${(bytes / 1024 / 1024).toStringAsFixed(1)} MB';
}

/// Channel chip: executive channels in navy, the rest in platinum.
class NoticeChannelChip extends StatelessWidget {
  const NoticeChannelChip(this.channel, {super.key, this.dense = true});
  final String channel;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final exec = _executive(channel);
    final fg = exec ? AbgColors.platinumBright : AbgColors.navy500;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: dense ? 8 : 10, vertical: 4),
      decoration: BoxDecoration(
        color: exec ? AbgColors.navy : AbgColors.platinumBright,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: exec ? AbgColors.navy : AbgColors.borderStrong,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(noticeChannelIcon(channel), size: dense ? 13 : 15, color: fg),
          const SizedBox(width: 4),
          Text(
            noticeChannelLabel(L.of(context), channel),
            style: AbgText.caption.copyWith(
              color: fg,
              fontWeight: FontWeight.w700,
              fontSize: dense ? 11 : 12,
            ),
          ),
        ],
      ),
    );
  }
}

/// The urgent highlight: solid red, an icon and the word — never colour alone.
class NoticeUrgentBadge extends StatelessWidget {
  const NoticeUrgentBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AbgColors.danger,
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          BoxShadow(
            color: AbgColors.danger.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.notification_important_rounded,
            size: 13,
            color: Colors.white,
          ),
          const SizedBox(width: 4),
          Text(
            L.of(context).nbUrgent.toUpperCase(),
            style: AbgText.caption.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 10.5,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── The board ───────────────────────────────────────────────────────────────

/// Every notice addressed to the signed-in person: pinned first, then urgent,
/// then the newest. Filter by channel or unread; pull to refresh; scroll for more.
class NoticesScreen extends StatefulWidget {
  const NoticesScreen({super.key});

  @override
  State<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends State<NoticesScreen> {
  String? _channel;
  bool _unreadOnly = false;
  List<NoticeRow> _items = [];
  NoticeCounts? _counts;
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

  Map<String, String?> _query([String? cursor]) => {
    'limit': '20',
    'channel': _channel,
    'unread': _unreadOnly ? 'true' : null,
    'cursor': cursor,
  };

  Future<void> _load() async {
    setState(() => _loading = _items.isEmpty);
    final api = context.read<ApiClient>();
    try {
      final results = await Future.wait([
        api.get('/notices', query: _query()),
        api.get('/notices/unread-count'),
      ]);
      if (!mounted) return;
      final page = results[0] as Json;
      setState(() {
        _items = [
          for (final i in page['items'] as List) NoticeRow.fromJson(i as Json),
        ];
        _cursor = page['nextCursor'] as String?;
        _counts = NoticeCounts.fromJson(results[1] as Json);
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
      final page =
          await context.read<ApiClient>().get(
                '/notices',
                query: _query(_cursor),
              )
              as Json;
      if (!mounted) return;
      setState(() {
        _items = [
          ..._items,
          for (final i in page['items'] as List) NoticeRow.fromJson(i as Json),
        ];
        _cursor = page['nextCursor'] as String?;
      });
    } catch (_) {
      // The next scroll or a pull to refresh tries again.
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _filter({String? channel, bool? unread, bool clearChannel = false}) {
    setState(() {
      if (clearChannel) _channel = null;
      if (channel != null) _channel = channel;
      if (unread != null) _unreadOnly = unread;
      _items = [];
      _cursor = null;
    });
    unawaited(_load());
  }

  Future<void> _open(NoticeRow row) async {
    await context.push('/notices/${row.id}');
    if (mounted) unawaited(_load());
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.nbTitle)),
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
            _BoardHeader(
              counts: _counts,
              unreadOnly: _unreadOnly,
              onUnread: () => _filter(unread: !_unreadOnly),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _FilterChip(
                    label: l.nbFilterAll,
                    icon: Icons.campaign_outlined,
                    selected: _channel == null,
                    onTap: () => _filter(clearChannel: true),
                  ),
                  for (final c in noticeChannels)
                    _FilterChip(
                      label: noticeChannelLabel(l, c),
                      icon: noticeChannelIcon(c),
                      selected: _channel == c,
                      onTap: () => _filter(channel: c),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            if (_loading) ...[
              const SkeletonCard(),
              const SizedBox(height: 10),
              const SkeletonCard(),
              const SizedBox(height: 10),
              const SkeletonCard(),
            ] else if (_error != null)
              ErrorPanel(error: _error!, onRetry: _load)
            else if (_items.isEmpty)
              EmptyState(
                icon: _unreadOnly
                    ? Icons.mark_email_read_outlined
                    : Icons.campaign_outlined,
                title: _unreadOnly ? l.allCaughtUp : l.nbEmpty,
                message: _unreadOnly ? l.nbEmptyUnreadHint : l.nbEmptyHint,
                action: _unreadOnly || _channel != null ? l.nbShowAll : null,
                onAction: () => _filter(unread: false, clearChannel: true),
              )
            else
              for (final row in _items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: NoticeCard(row: row, onTap: () => _open(row)),
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

class _BoardHeader extends StatelessWidget {
  const _BoardHeader({
    required this.counts,
    required this.unreadOnly,
    required this.onUnread,
  });

  final NoticeCounts? counts;
  final bool unreadOnly;
  final VoidCallback onUnread;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final c = counts;
    return HeroBackground(
      borderRadius: BorderRadius.circular(AbgRadii.lg),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 12, 14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white24),
              ),
              child: const Icon(
                Icons.campaign_rounded,
                color: AbgColors.platinumBright,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    c == null ? l.nbSubtitle : l.nbUnreadCount(c.unread),
                    style: AbgText.h3.copyWith(color: Colors.white),
                  ),
                  if (c != null && c.toAcknowledge > 0) ...[
                    const SizedBox(height: 2),
                    Text(
                      l.nbToAckCount(c.toAcknowledge),
                      style: AbgText.small.copyWith(color: AbgColors.platinum),
                    ),
                  ],
                ],
              ),
            ),
            if (c != null && (c.unread > 0 || unreadOnly))
              TextButton(
                onPressed: onUnread,
                style: TextButton.styleFrom(
                  foregroundColor: AbgColors.platinumBright,
                  minimumSize: const Size(64, kMinTap),
                  backgroundColor: unreadOnly
                      ? Colors.white.withValues(alpha: 0.16)
                      : Colors.transparent,
                ),
                child: Text(unreadOnly ? l.nbFilterAll : l.nbFilterUnread),
              ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        avatar: Icon(
          icon,
          size: 16,
          color: selected ? Colors.white : AbgColors.navy500,
        ),
        label: Text(label),
        selected: selected,
        showCheckmark: false,
        selectedColor: AbgColors.navy,
        backgroundColor: AbgColors.white,
        labelStyle: AbgText.small.copyWith(
          color: selected ? Colors.white : AbgColors.navy,
          fontWeight: FontWeight.w600,
        ),
        side: BorderSide(
          color: selected ? AbgColors.navy : AbgColors.borderStrong,
        ),
        onSelected: (_) => onTap(),
      ),
    );
  }
}

/// A notice in the list: urgent ones carry a red accent and badge; unread ones a dot.
class NoticeCard extends StatelessWidget {
  const NoticeCard({super.key, required this.row, required this.onTap});

  final NoticeRow row;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final accent = row.urgent
        ? AbgColors.danger
        : row.pinned
        ? AbgColors.pending
        : null;
    final unread = !row.read;
    return Semantics(
      button: true,
      label: [
        if (row.urgent) l.nbUrgent,
        if (unread) l.nbNew,
        row.title,
      ].join(', '),
      child: Container(
        decoration: BoxDecoration(
          color: row.urgent ? const Color(0xFFFFF7F7) : AbgColors.white,
          borderRadius: BorderRadius.circular(AbgRadii.lg),
          border: Border.all(
            color: row.urgent
                ? AbgColors.danger.withValues(alpha: 0.35)
                : AbgColors.border,
          ),
          boxShadow: AbgShadows.card,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AbgRadii.lg),
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(
              onTap: onTap,
              child: Stack(
                children: [
                  if (accent != null)
                    Positioned(
                      left: 0,
                      top: 0,
                      bottom: 0,
                      child: Container(width: 5, color: accent),
                    ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 14, 14, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(child: NoticeChannelChip(row.channel)),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                noticeCategoryLabel(l, row.category),
                                style: AbgText.caption,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const Spacer(),
                            if (row.pinned)
                              Padding(
                                padding: const EdgeInsets.only(left: 6),
                                child: Icon(
                                  Icons.push_pin_rounded,
                                  size: 18,
                                  color: AbgColors.pending,
                                  semanticLabel: l.nbPinned,
                                ),
                              ),
                            if (row.urgent) ...[
                              const SizedBox(width: 6),
                              const NoticeUrgentBadge(),
                            ],
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (unread)
                              Container(
                                width: 9,
                                height: 9,
                                margin: const EdgeInsets.only(top: 7, right: 8),
                                decoration: const BoxDecoration(
                                  color: AbgColors.active,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            Expanded(
                              child: Text(
                                row.title,
                                style: AbgText.h3.copyWith(
                                  fontSize: 16.5,
                                  fontWeight: unread
                                      ? FontWeight.w800
                                      : FontWeight.w700,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          row.excerpt,
                          style: AbgText.small,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                [
                                  if (row.signedBy != null) row.signedBy!,
                                  if (row.publishedAt != null)
                                    relative(row.publishedAt!, l),
                                ].join(' · '),
                                style: AbgText.caption,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (row.hasAttachment)
                              Padding(
                                padding: const EdgeInsets.only(left: 6),
                                child: Icon(
                                  Icons.picture_as_pdf_outlined,
                                  size: 17,
                                  color: AbgColors.danger,
                                  semanticLabel: l.nbHasPdf,
                                ),
                              ),
                            if (unread) ...[
                              const SizedBox(width: 8),
                              Text(
                                l.nbNew,
                                style: AbgText.caption.copyWith(
                                  color: AbgColors.active,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ],
                        ),
                        if (row.acknowledged ||
                            row.awaitingAcknowledgement) ...[
                          const SizedBox(height: 10),
                          ToneBadge(
                            label: row.acknowledged
                                ? l.nbAcknowledged
                                : l.nbAckNeeded,
                            tone: row.acknowledged
                                ? Tone.success
                                : Tone.pending,
                            icon: row.acknowledged
                                ? Icons.verified_rounded
                                : Icons.pending_actions_rounded,
                            dense: true,
                          ),
                        ],
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

// ─── One notice ──────────────────────────────────────────────────────────────

/// The full notice. Opening it marks it read; the PDF opens in the phone's
/// viewer; "I have read and understood" records the acknowledgement.
class NoticeDetailScreen extends StatefulWidget {
  const NoticeDetailScreen({super.key, required this.id});
  final String id;

  @override
  State<NoticeDetailScreen> createState() => _NoticeDetailScreenState();
}

class _NoticeDetailScreenState extends State<NoticeDetailScreen> {
  NoticeDetail? _notice;
  Object? _error;
  bool _acknowledging = false;
  bool _opening = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<NoticeDetail?> _load() async {
    try {
      final json =
          await context.read<ApiClient>().get('/notices/${widget.id}') as Json;
      final notice = NoticeDetail(json);
      if (mounted) setState(() => (_notice = notice, _error = null));
      return notice;
    } catch (e) {
      if (mounted) setState(() => _error = e);
      return null;
    }
  }

  Future<void> _openPdf() async {
    final l = L.of(context);
    setState(() => _opening = true);
    try {
      // Signed links last ten minutes: always fetch a fresh one.
      final fresh = await _load();
      final url = fresh?.attachment?.url;
      if (url == null) return;
      final ok = await launchUrl(
        Uri.parse(apiUrl(url)),
        mode: LaunchMode.externalApplication,
      );
      if (!ok && mounted) showSnack(context, l.nbPdfFailed, error: true);
    } catch (_) {
      if (mounted) showSnack(context, l.nbPdfFailed, error: true);
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  Future<void> _acknowledge() async {
    final l = L.of(context);
    final api = context.read<ApiClient>();
    final ok = await confirmDialog(
      context,
      title: l.nbAckTitle,
      body: l.nbAckBody,
      confirm: l.nbAckConfirm,
    );
    if (!ok || !mounted) return;
    setState(() => _acknowledging = true);
    try {
      final json = await api.post('/notices/${widget.id}/acknowledge') as Json;
      if (!mounted) return;
      setState(() => _notice = NoticeDetail(json));
      showSnack(context, l.nbAckDone, icon: Icons.verified_rounded);
    } catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    } finally {
      if (mounted) setState(() => _acknowledging = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final n = _notice;
    return Scaffold(
      appBar: AppBar(title: Text(n?.referenceNumber ?? l.nbTitle)),
      body: _error != null && n == null
          ? Padding(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              child: ErrorPanel(error: _error!, onRetry: _load),
            )
          : n == null
          ? ListView(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              children: const [
                SkeletonCard(),
                SizedBox(height: 12),
                SkeletonCard(),
              ],
            )
          : RefreshIndicator(
              color: AbgColors.navy,
              onRefresh: _load,
              child: NoticeDetailView(
                notice: n,
                acknowledging: _acknowledging,
                openingPdf: _opening,
                onAcknowledge: _acknowledge,
                onOpenPdf: _openPdf,
              ),
            ),
    );
  }
}

/// The notice as a letter, then the attachment and the acknowledgement.
class NoticeDetailView extends StatelessWidget {
  const NoticeDetailView({
    super.key,
    required this.notice,
    required this.onAcknowledge,
    required this.onOpenPdf,
    this.acknowledging = false,
    this.openingPdf = false,
  });

  final NoticeDetail notice;
  final VoidCallback onAcknowledge;
  final VoidCallback onOpenPdf;
  final bool acknowledging;
  final bool openingPdf;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final n = notice;
    final signature = (n.signedBy ?? n.authorName).split(',');
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AbgSpace.gutter,
        8,
        AbgSpace.gutter,
        40,
      ),
      children: [
        Container(
          decoration: BoxDecoration(
            color: AbgColors.white,
            borderRadius: BorderRadius.circular(AbgRadii.lg),
            border: Border.all(
              color: n.urgent
                  ? AbgColors.danger.withValues(alpha: 0.4)
                  : AbgColors.border,
            ),
            boxShadow: AbgShadows.card,
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              HeroBackground(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                  child: Row(
                    children: [
                      const AbgLogo(width: 84),
                      const Spacer(),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            n.referenceNumber,
                            style: AbgText.mono.copyWith(
                              color: AbgColors.platinumBright,
                              fontSize: 12,
                            ),
                          ),
                          if (n.publishedAt != null)
                            Text(
                              fullStamp(n.publishedAt!, l.localeName),
                              style: AbgText.caption.copyWith(
                                color: AbgColors.platinumDeep,
                                fontSize: 11,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              if (n.urgent)
                Container(
                  color: AbgColors.danger,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 9,
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.notification_important_rounded,
                        color: Colors.white,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          l.nbUrgentBanner,
                          style: AbgText.small.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        NoticeChannelChip(n.channel, dense: false),
                        Text(
                          noticeCategoryLabel(l, n.category),
                          style: AbgText.caption,
                        ),
                        if (n.pinned)
                          ToneBadge(
                            label: l.nbPinned,
                            tone: Tone.pending,
                            icon: Icons.push_pin_rounded,
                            dense: true,
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Overline(l.nbFromOffice(noticeChannelLabel(l, n.channel))),
                    const SizedBox(height: 4),
                    Semantics(
                      header: true,
                      child: Text(n.title, style: AbgText.h1),
                    ),
                    const SizedBox(height: 12),
                    InfoRow(
                      icon: Icons.groups_outlined,
                      label: l.nbAudience,
                      value: n.toEveryone
                          ? l.nbAudienceAll
                          : n.offices.join(', '),
                    ),
                    if (n.expiresAt != null)
                      InfoRow(
                        icon: Icons.event_outlined,
                        label: l.nbOnBoardUntil,
                        value: fullStamp(n.expiresAt!, l.localeName),
                      ),
                    const Divider(height: 28),
                    for (final p in noticeParagraphs(n.body))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Text(
                          p,
                          style: AbgText.body.copyWith(height: 1.6),
                        ),
                      ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.only(left: 12),
                      decoration: const BoxDecoration(
                        border: Border(
                          left: BorderSide(color: AbgColors.navy, width: 2),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l.nbSignedBy, style: AbgText.caption),
                          Text(
                            signature.first.trim(),
                            style: AbgText.bodyStrong.copyWith(
                              color: AbgColors.navy,
                            ),
                          ),
                          if (signature.length > 1)
                            Text(
                              signature.skip(1).join(',').trim(),
                              style: AbgText.small,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (n.status == 'ARCHIVED' || n.expired) ...[
          const SizedBox(height: 12),
          _Note(
            icon: Icons.history_rounded,
            text: n.status == 'ARCHIVED' ? l.nbArchived : l.nbExpired,
          ),
        ],
        if (n.attachment != null) ...[
          const SizedBox(height: 20),
          SectionTitle(l.nbAttachment),
          SectionCard(
            padding: const EdgeInsets.all(14),
            onTap: openingPdf ? null : onOpenPdf,
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AbgColors.dangerSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.picture_as_pdf_rounded,
                    color: AbgColors.danger,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        n.attachment!.name,
                        style: AbgText.bodyStrong.copyWith(fontSize: 14),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'PDF · ${_fileSize(n.attachment!.sizeBytes)} · ${l.nbPdfHint}',
                        style: AbgText.caption,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                openingPdf
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Tooltip(
                        message: l.nbOpenPdf,
                        child: const Icon(
                          Icons.open_in_new_rounded,
                          color: AbgColors.navy500,
                        ),
                      ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 20),
        _AcknowledgeSection(
          notice: n,
          busy: acknowledging,
          onAcknowledge: onAcknowledge,
        ),
      ],
    );
  }
}

class _AcknowledgeSection extends StatelessWidget {
  const _AcknowledgeSection({
    required this.notice,
    required this.busy,
    required this.onAcknowledge,
  });

  final NoticeDetail notice;
  final bool busy;
  final VoidCallback onAcknowledge;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final n = notice;
    if (n.isAuthor) {
      return _Note(icon: Icons.edit_note_rounded, text: l.nbAuthorNote);
    }
    if (n.acknowledged) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AbgColors.successSoft,
          borderRadius: BorderRadius.circular(AbgRadii.lg),
          border: Border.all(color: AbgColors.success.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            const Icon(Icons.verified_rounded, color: AbgColors.success),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                l.nbAckedOn(
                  n.acknowledgedAt != null
                      ? fullStamp(n.acknowledgedAt!, l.localeName)
                      : '',
                ),
                style: AbgText.bodyStrong.copyWith(
                  color: AbgColors.success,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ),
      );
    }
    if (!n.requiresAcknowledgement) {
      return _Note(icon: Icons.info_outline_rounded, text: l.nbNoAckNeeded);
    }
    if (!n.can('ACKNOWLEDGE')) {
      return _Note(icon: Icons.history_rounded, text: l.nbAckExpired);
    }
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.pending_actions_rounded,
                color: AbgColors.pending,
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(l.nbAckPrompt, style: AbgText.small)),
            ],
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: busy ? null : onAcknowledge,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              backgroundColor: AbgColors.navy,
            ),
            icon: busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.task_alt_rounded),
            label: Text(l.nbAckButton),
          ),
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AbgColors.surface,
        borderRadius: BorderRadius.circular(AbgRadii.md),
        border: Border.all(color: AbgColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AbgColors.navy500),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: AbgText.small)),
        ],
      ),
    );
  }
}
