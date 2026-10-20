import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/formatting.dart';
import '../core/offline_queue.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';
import '../widgets/sync_banner.dart';
import '../widgets/timeline.dart';
import '../widgets/vocab.dart';
import 'parcel_actions.dart';

/// Order in which the single primary button is chosen from the actions the
/// server allows. Everything else goes into the "more" sheet.
const _primaryOrder = [
  'RECEIVE',
  'RECEIVE_ON_BEHALF',
  'CONFIRM_HANDOVER_SENDER',
  'REQUEST_HANDOVER',
  'START_TRANSIT',
  'MARK_ARRIVED',
  'RECEIVE_WITH_CODE',
  'ACCEPT_ASSIGNMENT',
  'START_RETURN',
  'CONFIRM_RETURN',
  'BOOK_DRAFT',
  'CONFIRM_HANDOVER_OFFICER',
];

const _secondary = [
  'CONFIRM_HANDOVER_PIN',
  'CHECKPOINT',
  'ATTACH',
  'COMMENT',
  'RECORD_EXCEPTION',
  'REQUEST_RETURN',
  'CANCEL',
];

class ParcelDetailScreen extends StatefulWidget {
  const ParcelDetailScreen({super.key, required this.id, this.scannedPayload});

  final String id;
  final String? scannedPayload;

  @override
  State<ParcelDetailScreen> createState() => _ParcelDetailScreenState();
}

class _ParcelDetailScreenState extends State<ParcelDetailScreen> {
  ParcelDetail? _parcel;
  Timeline? _timeline;
  Object? _error;
  bool _busy = false;
  int _queued = 0;

  late final OfflineQueue _queue = context.read<OfflineQueue>();

  @override
  void initState() {
    super.initState();
    _queued = _queue.forParcel(widget.id).length;
    _queue.addListener(_onQueue);
    unawaited(_load());
  }

  @override
  void dispose() {
    _queue.removeListener(_onQueue);
    super.dispose();
  }

  /// Reload when a queued action for this parcel finishes syncing.
  void _onQueue() {
    final waiting = _queue.forParcel(widget.id).length;
    if (waiting < _queued) unawaited(_load());
    _queued = waiting;
  }

  Future<void> _load() async {
    final repo = context.read<DispatchRepository>();
    try {
      final r = await Future.wait([
        repo.parcel(widget.id),
        repo.timeline(widget.id),
      ]);
      if (mounted) {
        setState(() {
          _parcel = r[0] as ParcelDetail;
          _timeline = r[1] as Timeline;
          _error = null;
        });
      }
    } catch (e) {
      // A colleague who scanned the label can see the parcel but not its full history.
      if (mounted && _parcel == null && widget.scannedPayload != null) {
        try {
          final scan = await repo.scan(widget.scannedPayload!);
          if (mounted) setState(() => _parcel = scan.parcel);
          return;
        } catch (_) {}
      }
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _act(String action) async {
    final p = _parcel;
    if (p == null) return;
    setState(() => _busy = true);
    final result = await ParcelActions(
      context,
      p,
      scannedPayload: widget.scannedPayload,
    ).run(action);
    if (!mounted) return;
    setState(() => _busy = false);
    if (result?.parcel != null) setState(() => _parcel = result!.parcel);
    if (result != null) unawaited(_load());
  }

  String _actionLabel(L l, String a) => switch (a) {
    'ACCEPT_ASSIGNMENT' => l.actionAccept,
    'REQUEST_HANDOVER' => l.actionRequestHandover,
    'CONFIRM_HANDOVER_SENDER' => l.actionConfirmHandover,
    'CONFIRM_HANDOVER_PIN' => l.actionEnterPin,
    'CONFIRM_HANDOVER_OFFICER' => l.actionOfficerHandover,
    'START_TRANSIT' => l.actionStartTransit,
    'CHECKPOINT' => l.actionCheckpoint,
    'MARK_ARRIVED' => l.actionArrived,
    'RECEIVE' => l.actionReceive,
    'RECEIVE_ON_BEHALF' => l.actionReceiveOnBehalf,
    'RECEIVE_WITH_CODE' => l.actionReceiveWithCode,
    'RECORD_EXCEPTION' => l.actionException,
    'CANCEL' => l.actionCancel,
    'REQUEST_RETURN' => l.actionReturn,
    'START_RETURN' => l.actionStartReturn,
    'CONFIRM_RETURN' => l.actionConfirmReturn,
    'BOOK_DRAFT' => l.actionBook,
    'COMMENT' => l.actionComment,
    'ATTACH' => l.addEvidence,
    _ => a,
  };

  IconData _actionIcon(String a) => switch (a) {
    'ACCEPT_ASSIGNMENT' => Icons.thumb_up_alt_outlined,
    'REQUEST_HANDOVER' => Icons.qr_code_scanner_rounded,
    'CONFIRM_HANDOVER_SENDER' ||
    'CONFIRM_HANDOVER_OFFICER' => Icons.handshake_outlined,
    'CONFIRM_HANDOVER_PIN' => Icons.pin_outlined,
    'START_TRANSIT' => Icons.local_shipping_outlined,
    'CHECKPOINT' => Icons.flag_outlined,
    'MARK_ARRIVED' => Icons.where_to_vote_outlined,
    'RECEIVE' || 'RECEIVE_ON_BEHALF' => Icons.verified_rounded,
    'RECEIVE_WITH_CODE' => Icons.sms_outlined,
    'RECORD_EXCEPTION' => Icons.report_problem_outlined,
    'CANCEL' => Icons.cancel_outlined,
    'REQUEST_RETURN' ||
    'START_RETURN' ||
    'CONFIRM_RETURN' => Icons.assignment_return_outlined,
    'BOOK_DRAFT' => Icons.send_rounded,
    'COMMENT' => Icons.sticky_note_2_outlined,
    'ATTACH' => Icons.add_a_photo_outlined,
    _ => Icons.chevron_right_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final p = _parcel;
    if (p == null) {
      return Scaffold(
        appBar: AppBar(),
        body: _error != null
            ? ErrorPanel(error: _error!, onRetry: _load)
            : ListView(
                padding: const EdgeInsets.all(20),
                children: const [
                  SkeletonCard(),
                  SizedBox(height: 12),
                  SkeletonCard(),
                  SizedBox(height: 12),
                  SkeletonCard(),
                ],
              ),
      );
    }
    final primary = _primaryOrder.firstWhere(p.can, orElse: () => '');
    final more = _secondary.where((a) => p.can(a) && a != primary).toList();
    final top = MediaQuery.of(context).padding.top;

    return Scaffold(
      body: RefreshIndicator(
        color: AbgColors.navy,
        onRefresh: _load,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _Header(
              parcel: p,
              top: top,
              onQr: p.qrPayload == null
                  ? null
                  : () => context.push('/parcels/${p.id}/label', extra: p),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AbgSpace.gutter,
                18,
                AbgSpace.gutter,
                140,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SyncBanner(parcelId: p.id),
                  if (p.isOverdue || p.hasOpenException) ...[
                    _AlertStrip(
                      parcel: p,
                      exceptions: _timeline?.exceptions ?? const [],
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (p.receipt != null) ...[
                    _ReceiptCard(receipt: p.receipt!, intended: p.receiverName),
                    const SizedBox(height: 14),
                  ],
                  _DescriptionCard(parcel: p),
                  const SizedBox(height: 14),
                  _RouteCard(parcel: p),
                  if (p.carrier != null) ...[
                    const SizedBox(height: 14),
                    _CarrierCard(carrier: p.carrier!),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.timeline),
                  SectionCard(
                    padding: const EdgeInsets.fromLTRB(14, 18, 16, 4),
                    child: _timeline == null
                        ? const Column(
                            children: [
                              Skeleton(height: 14),
                              SizedBox(height: 14),
                              Skeleton(height: 14),
                              SizedBox(height: 14),
                            ],
                          )
                        : CustodyTimeline(
                            events: _timeline!.events,
                            status: p.status,
                          ),
                  ),
                  if ((_timeline?.attachments ?? const []).isNotEmpty) ...[
                    const SizedBox(height: 22),
                    SectionTitle(l.attachments),
                    SectionCard(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        children: _timeline!.attachments
                            .map(
                              (a) => ListTile(
                                leading: Icon(
                                  a['mimeType'] == 'application/pdf'
                                      ? Icons.picture_as_pdf_outlined
                                      : Icons.image_outlined,
                                  color: AbgColors.navy500,
                                ),
                                title: Text(
                                  a['fileName'] as String? ?? '',
                                  style: AbgText.bodyStrong.copyWith(
                                    fontSize: 14,
                                  ),
                                ),
                                subtitle: Text(
                                  '${a['kind']} · ${a['uploadedBy']}',
                                  style: AbgText.caption,
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ],
                  if ((_timeline?.comments ?? const []).isNotEmpty) ...[
                    const SizedBox(height: 22),
                    SectionTitle(l.notes),
                    ..._timeline!.comments.map(
                      (c) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: SectionCard(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    c['author'] as String? ?? '',
                                    style: AbgText.bodyStrong.copyWith(
                                      fontSize: 13.5,
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    dayAndTime(
                                      DateTime.parse(c['createdAt'] as String),
                                      l.localeName,
                                    ),
                                    style: AbgText.caption,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                c['body'] as String? ?? '',
                                style: AbgText.body.copyWith(fontSize: 14),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: (primary.isEmpty && more.isEmpty)
          ? null
          : SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                decoration: const BoxDecoration(
                  color: AbgColors.white,
                  border: Border(top: BorderSide(color: AbgColors.border)),
                  boxShadow: AbgShadows.raised,
                ),
                child: Row(
                  children: [
                    if (primary.isNotEmpty)
                      Expanded(
                        child: FilledButton.icon(
                          style: primary.startsWith('RECEIVE')
                              ? FilledButton.styleFrom(
                                  backgroundColor: AbgColors.success,
                                )
                              : null,
                          onPressed: _busy ? null : () => _act(primary),
                          icon: _busy
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Icon(_actionIcon(primary)),
                          label: Text(_actionLabel(l, primary)),
                        ),
                      ),
                    if (more.isNotEmpty && primary.isEmpty)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _busy ? null : () => _showMore(more),
                          icon: const Icon(Icons.more_horiz_rounded),
                          label: Text(l.moreActions),
                        ),
                      ),
                    if (more.isNotEmpty && primary.isNotEmpty) ...[
                      const SizedBox(width: 10),
                      Tooltip(
                        message: l.moreActions,
                        child: SizedBox(
                          height: 54,
                          width: 54,
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(54, 54),
                            ),
                            onPressed: _busy ? null : () => _showMore(more),
                            child: const Icon(Icons.more_horiz_rounded),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
    );
  }

  void _showMore(List<String> actions) {
    final l = L.of(context);
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: actions
              .map(
                (a) => ListTile(
                  minTileHeight: 56,
                  leading: Icon(
                    _actionIcon(a),
                    color: a == 'CANCEL' || a == 'RECORD_EXCEPTION'
                        ? AbgColors.danger
                        : AbgColors.navy,
                  ),
                  title: Text(
                    _actionLabel(l, a),
                    style: AbgText.bodyStrong.copyWith(
                      color: a == 'CANCEL' ? AbgColors.danger : AbgColors.ink,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    unawaited(_act(a));
                  },
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.parcel, required this.top, this.onQr});

  final ParcelDetail parcel;
  final double top;
  final VoidCallback? onQr;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final p = parcel;
    return HeroBackground(
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(30)),
      child: Padding(
        padding: EdgeInsets.fromLTRB(8, top + 4, AbgSpace.gutter, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(
                  tooltip: l.back,
                  onPressed: () => context.pop(),
                  icon: const Icon(
                    Icons.arrow_back_rounded,
                    color: AbgColors.platinumBright,
                  ),
                ),
                const Spacer(),
                if (onQr != null)
                  TextButton.icon(
                    onPressed: onQr,
                    style: TextButton.styleFrom(
                      foregroundColor: AbgColors.platinumBright,
                    ),
                    icon: const Icon(Icons.qr_code_2_rounded),
                    label: Text(l.showQr),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(left: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      TrackingNumber(
                        p.trackingNumber,
                        onDark: true,
                        size: 13.5,
                      ),
                      const Spacer(),
                      StatusChip(p.status),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    p.title,
                    style: AbgText.h1.copyWith(
                      color: Colors.white,
                      fontSize: 25,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ToneBadge(
                        label: priorityLabel(l, p.priority),
                        tone: priorityTone(p.priority),
                        icon: Icons.bolt_rounded,
                        onDark: true,
                      ),
                      ToneBadge(
                        label: classificationLabel(l, p.classification),
                        tone: Tone.neutral,
                        icon: classificationIcon(p.classification),
                        onDark: true,
                      ),
                      if (p.category.isNotEmpty)
                        ToneBadge(
                          label: p.category,
                          tone: Tone.neutral,
                          icon: Icons.folder_outlined,
                          onDark: true,
                        ),
                    ],
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

class _AlertStrip extends StatelessWidget {
  const _AlertStrip({required this.parcel, required this.exceptions});

  final ParcelDetail parcel;
  final List<Json> exceptions;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final open = exceptions.where((e) => e['open'] == true).toList();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AbgColors.dangerSoft,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        border: Border.all(color: AbgColors.danger.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.report_problem_outlined, color: AbgColors.danger),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  [
                    if (parcel.isOverdue) l.overdue,
                    if (parcel.hasOpenException) l.exceptionOpen,
                  ].join(' · '),
                  style: AbgText.bodyStrong.copyWith(color: AbgColors.danger),
                ),
                for (final e in open)
                  Text(
                    '${exceptionLabel(l, e['code'] as String)} — ${e['details']}',
                    style: AbgText.small.copyWith(color: AbgColors.danger),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceiptCard extends StatelessWidget {
  const _ReceiptCard({required this.receipt, required this.intended});

  final ReceiptInfo receipt;
  final String intended;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AbgColors.successSoft,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        border: Border.all(color: AbgColors.success.withValues(alpha: 0.28)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: AbgColors.success,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.verified_rounded, color: Colors.white),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Overline(l.receivedBy, color: AbgColors.success),
                const SizedBox(height: 4),
                Text(
                  receipt.name,
                  style: AbgText.h3.copyWith(color: AbgColors.ink),
                ),
                if (receipt.code != null)
                  Text(
                    receipt.code!,
                    style: AbgText.mono.copyWith(fontSize: 12),
                  ),
                const SizedBox(height: 6),
                Text(
                  fullStamp(receipt.receivedAt, l.localeName),
                  style: AbgText.small.copyWith(color: AbgColors.ink),
                ),
                if (receipt.verification != null)
                  Text(
                    '${l.verifiedBy}: ${receipt.verification!.replaceAll('_', ' ').toLowerCase()}',
                    style: AbgText.caption,
                  ),
                if (receipt.onBehalf) ...[
                  const SizedBox(height: 8),
                  ToneBadge(
                    label: l.onBehalfOf(intended),
                    tone: Tone.pending,
                    icon: Icons.supervisor_account_outlined,
                    dense: true,
                  ),
                  if (receipt.reason != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        '“${receipt.reason}”',
                        style: AbgText.small.copyWith(
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DescriptionCard extends StatelessWidget {
  const _DescriptionCard({required this.parcel});
  final ParcelDetail parcel;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final restricted = parcel.contentAccess != 'FULL';
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Overline(l.details),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (restricted) ...[
                const Icon(
                  Icons.lock_outline_rounded,
                  size: 18,
                  color: AbgColors.inkSubtle,
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(
                  restricted ? l.contentHidden : parcel.description,
                  style: AbgText.body.copyWith(
                    color: restricted ? AbgColors.inkSubtle : AbgColors.ink,
                  ),
                ),
              ),
            ],
          ),
          if (parcel.sentOnBehalf) ...[
            const SizedBox(height: 10),
            Text(l.sentOnBehalf(parcel.createdByName), style: AbgText.caption),
          ],
        ],
      ),
    );
  }
}

class _RouteCard extends StatelessWidget {
  const _RouteCard({required this.parcel});
  final ParcelDetail parcel;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final p = parcel;
    final sender = p.sender;
    final receiver = p.receiverEmployee;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Endpoint(
            label: l.from,
            name: sender?.name ?? '',
            meta: [
              sender?.code,
              sender?.department,
            ].whereType<String>().join(' · '),
            place: p.originLocation ?? p.originBranch,
            initials: sender?.initials ?? '?',
            phone: sender?.phone,
            color: AbgColors.active,
            connector: true,
          ),
          _Endpoint(
            label: l.to,
            name: p.receiverName,
            meta: [
              receiver?.code,
              receiver?.department,
            ].whereType<String>().join(' · '),
            place: p.destinationLocation ?? p.destinationBranch,
            initials:
                receiver?.initials ??
                (p.receiverName.isNotEmpty ? p.receiverName[0] : '?'),
            phone: receiver?.phone,
            color: AbgColors.success,
            connector: false,
          ),
          if (p.expectedDeliveryAt != null) ...[
            const Divider(height: 22),
            Row(
              children: [
                Icon(
                  Icons.timer_outlined,
                  size: 17,
                  color: p.isOverdue ? AbgColors.danger : AbgColors.inkSubtle,
                ),
                const SizedBox(width: 8),
                Text(
                  l.expectedBy(dayAndTime(p.expectedDeliveryAt!, l.localeName)),
                  style: AbgText.small.copyWith(
                    color: p.isOverdue ? AbgColors.danger : null,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _Endpoint extends StatelessWidget {
  const _Endpoint({
    required this.label,
    required this.name,
    required this.meta,
    required this.place,
    required this.initials,
    required this.color,
    required this.connector,
    this.phone,
  });

  final String label;
  final String name;
  final String meta;
  final String place;
  final String initials;
  final String? phone;
  final Color color;
  final bool connector;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.10),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withValues(alpha: 0.35)),
                ),
                child: Text(
                  initials,
                  style: AbgText.small.copyWith(
                    color: color,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (connector)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: CustomPaint(
                      painter: _DashPainter(),
                      child: const SizedBox(width: 2),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: connector ? 18 : 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Overline(label),
                  const SizedBox(height: 3),
                  Text(name, style: AbgText.h3),
                  if (meta.isNotEmpty) Text(meta, style: AbgText.caption),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.place_outlined,
                        size: 14,
                        color: AbgColors.inkSubtle,
                      ),
                      const SizedBox(width: 4),
                      Expanded(child: Text(place, style: AbgText.small)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (phone != null && !phone!.contains('•'))
            IconButton(
              tooltip: L.of(context).call,
              onPressed: () => launchUrl(Uri(scheme: 'tel', path: phone)),
              icon: const Icon(Icons.call_outlined, color: AbgColors.navy500),
            ),
        ],
      ),
    );
  }
}

class _DashPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AbgColors.borderStrong
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    for (double y = 0; y < size.height; y += 7) {
      canvas.drawLine(
        Offset(size.width / 2, y),
        Offset(size.width / 2, (y + 3).clamp(0, size.height)),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _CarrierCard extends StatelessWidget {
  const _CarrierCard({required this.carrier});
  final CarrierInfo carrier;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final c = carrier;
    final details = [
      if (c.code != null && c.type != 'EXTERNAL_COURIER') c.code!,
      if (c.vehicleNumber != null) c.vehicleNumber!,
      if (c.externalTrackingNumber != null) c.externalTrackingNumber!,
      if (c.externalStatus != null) 'Courier: ${c.externalStatus}',
    ];
    return SectionCard(
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: AbgGradients.hero,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              carrierTypeIcon(c.type),
              color: AbgColors.platinumBright,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Overline('${l.carrier} · ${carrierTypeLabel(l, c.type)}'),
                const SizedBox(height: 3),
                Text(c.name, style: AbgText.h3),
                if (details.isNotEmpty)
                  Text(details.join(' · '), style: AbgText.caption),
              ],
            ),
          ),
          if (c.phone != null && !c.phone!.contains('•'))
            IconButton.filledTonal(
              tooltip: l.call,
              style: IconButton.styleFrom(
                backgroundColor: AbgColors.platinumBright,
                minimumSize: const Size(48, 48),
              ),
              onPressed: () => launchUrl(Uri(scheme: 'tel', path: c.phone)),
              icon: const Icon(Icons.call_rounded, color: AbgColors.navy),
            ),
        ],
      ),
    );
  }
}
