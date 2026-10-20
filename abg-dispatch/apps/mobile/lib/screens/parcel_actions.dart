import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:signature/signature.dart';

import '../core/api_client.dart';
import '../core/offline_queue.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import '../widgets/vocab.dart';

/// Result of an action: the refreshed parcel, or `queued` when it was saved offline.
class ActionResult {
  ActionResult({this.parcel, this.queued = false});
  final ParcelDetail? parcel;
  final bool queued;
}

/// Runs custody actions for one parcel and shows the right confirmation UI.
class ParcelActions {
  ParcelActions(this.context, this.parcel, {this.scannedPayload});

  final BuildContext context;
  final ParcelDetail parcel;

  /// Set when the user arrived here by scanning the physical label.
  final String? scannedPayload;

  L get l => L.of(context);
  DispatchRepository get repo => context.read<DispatchRepository>();
  OfflineQueue get queue => context.read<OfflineQueue>();

  /// Offline-capable: queued with an idempotency key if there's no signal.
  Future<ActionResult?> _custody(
    String action,
    String label,
    Map<String, dynamic> body,
  ) async {
    final (outcome, res) = await queue.send(
      parcelId: parcel.id,
      trackingNumber: parcel.trackingNumber,
      label: label,
      path: '/parcels/${parcel.id}/$action',
      body: body,
    );
    if (outcome == SendOutcome.queued) {
      if (context.mounted) {
        showSnack(context, l.savedOffline, icon: Icons.cloud_off_rounded);
      }
      return ActionResult(queued: true);
    }
    return ActionResult(parcel: ParcelDetail((res as Json)['parcel'] as Json));
  }

  Future<ActionResult?> _online(String action, [Json body = const {}]) async {
    final res = await repo.post('/parcels/${parcel.id}/$action', body);
    final p = res['parcel'];
    return ActionResult(
      parcel: p is Json && p['viewer'] != null ? ParcelDetail(p) : null,
    );
  }

  Future<ActionResult?> run(String action) async {
    try {
      return await _run(action);
    } on ApiException catch (e) {
      if (context.mounted) {
        showSnack(context, errorText(context, e), error: true);
      }
      return null;
    }
  }

  Future<ActionResult?> _run(String action) async {
    final carrierName = parcel.carrier?.name ?? l.carrier;
    switch (action) {
      case 'ACCEPT_ASSIGNMENT':
        return _online('accept');
      case 'REQUEST_HANDOVER':
        final r = await _online('handover/request');
        if (context.mounted) showSnack(context, l.handoverRequested);
        return r;
      case 'CONFIRM_HANDOVER_SENDER':
        if (!await confirmDialog(
          context,
          title: l.actionConfirmHandover,
          body: l.confirmHandoverBody(carrierName),
          confirm: l.confirm,
        )) {
          return null;
        }
        return _online('handover/confirm', {'method': 'SENDER_APP'});
      case 'CONFIRM_HANDOVER_OFFICER':
        if (!await confirmDialog(
          context,
          title: l.actionOfficerHandover,
          body: l.confirmHandoverBody(carrierName),
          confirm: l.confirm,
        )) {
          return null;
        }
        return _online('handover/confirm', {'method': 'DISPATCH_OFFICER'});
      case 'CONFIRM_HANDOVER_PIN':
        final pin = await _codeSheet(
          title: l.pinTitle,
          body: l.pinHint,
          icon: Icons.pin_outlined,
        );
        if (pin == null) return null;
        return _custody('handover/confirm', l.actionConfirmHandover, {
          'method': 'SENDER_PIN',
          'pin': pin,
        });
      case 'START_TRANSIT':
        return _custody('in-transit', l.actionStartTransit, {});
      case 'MARK_ARRIVED':
        if (!await confirmDialog(
          context,
          title: l.actionArrived,
          body: parcel.destinationLocation ?? parcel.destinationBranch,
          confirm: l.actionArrived,
        )) {
          return null;
        }
        return _custody('arrive', l.actionArrived, {});
      case 'CHECKPOINT':
        final label = await _textSheet(
          title: l.actionCheckpoint,
          label: l.checkpointLabel,
          hint: l.checkpointHint,
          icon: Icons.flag_outlined,
        );
        if (label == null) return null;
        return _custody('checkpoint', l.actionCheckpoint, {'label': label});
      case 'RECEIVE':
        return _receive(onBehalf: false);
      case 'RECEIVE_ON_BEHALF':
        return _receive(onBehalf: true);
      case 'REQUEST_RECEIPT_CODE':
      case 'RECEIVE_WITH_CODE':
        return _receiveWithCode();
      case 'RECORD_EXCEPTION':
        return _exception();
      case 'CANCEL':
        final reason = await _textSheet(
          title: l.cancelTitle,
          label: l.reasonLabel,
          hint: l.reasonHint,
          icon: Icons.cancel_outlined,
          destructive: true,
        );
        if (reason == null) return null;
        return _online('cancel', {'reason': reason});
      case 'REQUEST_RETURN':
        final reason = await _textSheet(
          title: l.returnTitle,
          label: l.reasonLabel,
          hint: l.reasonHint,
          icon: Icons.undo_rounded,
        );
        if (reason == null) return null;
        return _online('return', {'reason': reason});
      case 'START_RETURN':
        return _online('return/start');
      case 'CONFIRM_RETURN':
        if (!await confirmDialog(
          context,
          title: l.actionConfirmReturn,
          body: parcel.title,
          confirm: l.confirm,
        )) {
          return null;
        }
        return _online('return/complete', {
          'method': parcel.isSender ? 'SENDER_APP' : 'DISPATCH_OFFICER',
        });
      case 'BOOK_DRAFT':
        return _online('book');
      case 'COMMENT':
        final body = await _textSheet(
          title: l.actionComment,
          label: l.notes,
          hint: '',
          icon: Icons.sticky_note_2_outlined,
          minLength: 1,
        );
        if (body == null) return null;
        return _online('comments', {'body': body});
      case 'ATTACH':
        final id = await _captureEvidence();
        if (id == null) return null;
        if (context.mounted) showSnack(context, l.evidenceAdded);
        return ActionResult(parcel: await repo.parcel(parcel.id));
    }
    return null;
  }

  Future<ActionResult?> _receive({required bool onBehalf}) async {
    final scanned = scannedPayload;
    final result = await showModalBottomSheet<Json>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _ReceiveSheet(
        parcel: parcel,
        onBehalf: onBehalf,
        viaQr: scanned != null,
      ),
    );
    if (result == null) return null;
    return _custody(
      'receive',
      onBehalf ? l.actionReceiveOnBehalf : l.actionReceive,
      {
        'method': scanned != null ? 'QR_CONFIRMATION' : 'APP_CONFIRMATION',
        'qrPayload': ?scanned,
        if (onBehalf)
          'onBehalf': {
            'reason': result['reason'],
            if ((result['relationship'] as String).isNotEmpty)
              'relationship': result['relationship'],
          },
      },
    );
  }

  Future<ActionResult?> _receiveWithCode() async {
    final sent = await repo.post('/parcels/${parcel.id}/receipt-code');
    if (!context.mounted) return null;
    final dev = sent['devOtp'] as String?;
    final highly = parcel.classification == 'HIGHLY_CONFIDENTIAL';
    final result = await showModalBottomSheet<Json>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _CodeReceiptSheet(
        sentTo: sent['sentTo'] as String?,
        devCode: dev,
        requireSignature: highly,
      ),
    );
    if (result == null) return null;
    String? signatureId;
    final png = result['signature'] as List<int>?;
    if (png != null) {
      final att = await repo.uploadEvidence(
        parcel.id,
        bytes: png,
        filename: 'signature.png',
        kind: 'SIGNATURE',
      );
      signatureId = att['id'] as String;
    }
    return _online('receive', {
      'method': 'OTP',
      'code': result['code'],
      'signatureAttachmentId': ?signatureId,
    });
  }

  Future<ActionResult?> _exception() async {
    final result = await showModalBottomSheet<Json>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _ExceptionSheet(),
    );
    if (result == null) return null;
    return _custody('exceptions', l.actionException, {
      'code': result['code'],
      'details': result['details'],
    });
  }

  Future<String?> _captureEvidence() async {
    final picker = ImagePicker();
    final file = await picker
        .pickImage(source: ImageSource.camera, maxWidth: 1600, imageQuality: 82)
        .catchError(
          (_) => picker.pickImage(
            source: ImageSource.gallery,
            maxWidth: 1600,
            imageQuality: 82,
          ),
        );
    if (file == null) return null;
    final bytes = await file.readAsBytes();
    final att = await repo.uploadEvidence(
      parcel.id,
      bytes: bytes,
      filename: file.name.isEmpty ? 'evidence.jpg' : file.name,
      kind: 'PROOF_OF_DELIVERY',
    );
    return att['id'] as String?;
  }

  Future<String?> _codeSheet({
    required String title,
    required String body,
    required IconData icon,
  }) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _SheetFrame(
        icon: icon,
        title: title,
        body: body,
        child: _CodeField(
          onSubmit: (v) => Navigator.pop(ctx, v),
          submitLabel: l.confirm,
        ),
      ),
    );
  }

  Future<String?> _textSheet({
    required String title,
    required String label,
    required String hint,
    required IconData icon,
    bool destructive = false,
    int minLength = 3,
  }) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _SheetFrame(
        icon: icon,
        title: title,
        child: _TextSubmit(
          label: label,
          hint: hint,
          minLength: minLength,
          destructive: destructive,
          onSubmit: (v) => Navigator.pop(ctx, v),
        ),
      ),
    );
  }
}

class _SheetFrame extends StatelessWidget {
  const _SheetFrame({
    required this.icon,
    required this.title,
    required this.child,
    this.body,
  });

  final IconData icon;
  final String title;
  final String? body;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        22,
        0,
        22,
        22 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: AbgGradients.hero,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: AbgColors.platinumBright, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(child: Text(title, style: AbgText.h2)),
              ],
            ),
            if (body != null) ...[
              const SizedBox(height: 12),
              Text(
                body!,
                style: AbgText.body.copyWith(color: AbgColors.inkMuted),
              ),
            ],
            const SizedBox(height: 18),
            child,
          ],
        ),
      ),
    );
  }
}

class _CodeField extends StatefulWidget {
  const _CodeField({required this.onSubmit, required this.submitLabel});
  final ValueChanged<String> onSubmit;
  final String submitLabel;

  @override
  State<_CodeField> createState() => _CodeFieldState();
}

class _CodeFieldState extends State<_CodeField> {
  final _c = TextEditingController();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _c,
          autofocus: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: AbgText.h1.copyWith(
            letterSpacing: 14,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
          decoration: const InputDecoration(
            counterText: '',
            hintText: '••••••',
          ),
          onChanged: (_) => setState(() {}),
          onSubmitted: (v) => v.length == 6 ? widget.onSubmit(v) : null,
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _c.text.length == 6
              ? () => widget.onSubmit(_c.text)
              : null,
          child: Text(widget.submitLabel),
        ),
      ],
    );
  }
}

class _TextSubmit extends StatefulWidget {
  const _TextSubmit({
    required this.label,
    required this.hint,
    required this.onSubmit,
    this.minLength = 3,
    this.destructive = false,
  });

  final String label;
  final String hint;
  final ValueChanged<String> onSubmit;
  final int minLength;
  final bool destructive;

  @override
  State<_TextSubmit> createState() => _TextSubmitState();
}

class _TextSubmitState extends State<_TextSubmit> {
  final _c = TextEditingController();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final ok = _c.text.trim().length >= widget.minLength;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _c,
          autofocus: true,
          minLines: 2,
          maxLines: 4,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: widget.hint.isEmpty ? null : widget.hint,
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        FilledButton(
          style: widget.destructive
              ? FilledButton.styleFrom(backgroundColor: AbgColors.danger)
              : null,
          onPressed: ok ? () => widget.onSubmit(_c.text.trim()) : null,
          child: Text(l.submit),
        ),
      ],
    );
  }
}

class _ReceiveSheet extends StatefulWidget {
  const _ReceiveSheet({
    required this.parcel,
    required this.onBehalf,
    required this.viaQr,
  });

  final ParcelDetail parcel;
  final bool onBehalf;
  final bool viaQr;

  @override
  State<_ReceiveSheet> createState() => _ReceiveSheetState();
}

class _ReceiveSheetState extends State<_ReceiveSheet> {
  final _reason = TextEditingController();
  final _relationship = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    _relationship.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final p = widget.parcel;
    final ready = !widget.onBehalf || _reason.text.trim().length >= 3;
    return _SheetFrame(
      icon: widget.onBehalf
          ? Icons.supervisor_account_outlined
          : Icons.verified_outlined,
      title: widget.onBehalf ? l.onBehalfTitle : l.receiveTitle,
      body: widget.onBehalf ? l.onBehalfBody(p.receiverName) : l.receiveBody,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AbgColors.surface,
              borderRadius: BorderRadius.circular(AbgRadii.md),
              border: Border.all(color: AbgColors.border),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.inventory_2_outlined,
                  color: AbgColors.navy500,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.title, style: AbgText.bodyStrong),
                      Text(
                        '${p.trackingNumber} · ${l.from}: ${p.sender?.name ?? ''}',
                        style: AbgText.caption,
                      ),
                    ],
                  ),
                ),
                if (widget.viaQr)
                  const ToneBadge(
                    label: 'QR',
                    tone: Tone.success,
                    icon: Icons.qr_code_2_rounded,
                    dense: true,
                  ),
              ],
            ),
          ),
          if (widget.onBehalf) ...[
            const SizedBox(height: 14),
            TextField(
              controller: _reason,
              decoration: InputDecoration(
                labelText: l.reasonLabel,
                hintText: l.reasonHint,
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _relationship,
              decoration: InputDecoration(
                labelText: l.relationshipLabel,
                hintText: l.relationshipHint,
              ),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: AbgColors.success),
            onPressed: ready
                ? () => Navigator.pop(context, {
                    'reason': _reason.text.trim(),
                    'relationship': _relationship.text.trim(),
                  })
                : null,
            icon: const Icon(Icons.verified_rounded),
            label: Text(
              widget.onBehalf ? l.actionReceiveOnBehalf : l.actionReceive,
            ),
          ),
        ],
      ),
    );
  }
}

class _CodeReceiptSheet extends StatefulWidget {
  const _CodeReceiptSheet({
    required this.sentTo,
    required this.devCode,
    required this.requireSignature,
  });

  final String? sentTo;
  final String? devCode;
  final bool requireSignature;

  @override
  State<_CodeReceiptSheet> createState() => _CodeReceiptSheetState();
}

class _CodeReceiptSheetState extends State<_CodeReceiptSheet> {
  final _code = TextEditingController();
  final _sig = SignatureController(
    penStrokeWidth: 2.4,
    penColor: AbgColors.navy,
    exportBackgroundColor: Colors.white,
  );
  bool _signed = false;

  @override
  void initState() {
    super.initState();
    _sig.onDrawEnd = () => setState(() => _signed = _sig.isNotEmpty);
  }

  @override
  void dispose() {
    _code.dispose();
    _sig.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final ready =
        _code.text.length == 6 && (!widget.requireSignature || _signed);
    return _SheetFrame(
      icon: Icons.sms_outlined,
      title: l.receiptCodeTitle,
      body:
          '${l.receiptCodeBody}${widget.sentTo != null ? '\n${l.sentToPhone(widget.sentTo!)}' : ''}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _code,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: AbgText.h1.copyWith(letterSpacing: 14),
            decoration: const InputDecoration(
              counterText: '',
              hintText: '••••••',
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (widget.devCode != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                l.devCode(widget.devCode!),
                style: AbgText.mono,
                textAlign: TextAlign.center,
              ),
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  l.signature,
                  style: AbgText.small.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              TextButton(
                onPressed: () => setState(() {
                  _sig.clear();
                  _signed = false;
                }),
                child: Text(l.clear),
              ),
            ],
          ),
          Container(
            height: 150,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AbgRadii.md),
              border: Border.all(color: AbgColors.borderStrong),
            ),
            clipBehavior: Clip.antiAlias,
            child: Signature(controller: _sig, backgroundColor: Colors.white),
          ),
          if (widget.requireSignature)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                l.signatureRequired,
                style: AbgText.caption.copyWith(color: AbgColors.pending),
              ),
            ),
          const SizedBox(height: 16),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: AbgColors.success),
            onPressed: ready
                ? () async {
                    final png = _signed ? await _sig.toPngBytes() : null;
                    if (context.mounted) {
                      Navigator.pop(context, {
                        'code': _code.text,
                        'signature': png?.toList(),
                      });
                    }
                  }
                : null,
            icon: const Icon(Icons.verified_rounded),
            label: Text(l.actionReceive),
          ),
        ],
      ),
    );
  }
}

class _ExceptionSheet extends StatefulWidget {
  const _ExceptionSheet();

  @override
  State<_ExceptionSheet> createState() => _ExceptionSheetState();
}

class _ExceptionSheetState extends State<_ExceptionSheet> {
  String _code = 'RECEIVER_UNAVAILABLE';
  final _details = TextEditingController();

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return _SheetFrame(
      icon: Icons.report_problem_outlined,
      title: l.actionException,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l.exceptionType,
            style: AbgText.small.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: exceptionCodes
                .map(
                  (c) => ChoiceChip(
                    label: Text(exceptionLabel(l, c)),
                    selected: _code == c,
                    showCheckmark: false,
                    labelStyle: AbgText.small.copyWith(
                      color: _code == c ? Colors.white : AbgColors.ink,
                      fontWeight: FontWeight.w600,
                    ),
                    onSelected: (_) => setState(() => _code = c),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _details,
            minLines: 2,
            maxLines: 4,
            decoration: InputDecoration(labelText: l.exceptionDetails),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AbgColors.danger),
            onPressed: _details.text.trim().length >= 3
                ? () => Navigator.pop(context, {
                    'code': _code,
                    'details': _details.text.trim(),
                  })
                : null,
            child: Text(l.submit),
          ),
        ],
      ),
    );
  }
}
