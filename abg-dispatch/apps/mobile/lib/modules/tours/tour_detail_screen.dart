import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import 'tour_api.dart';
import 'tour_models.dart';
import 'tour_widgets.dart';

/// One tour request: where it stands in the approval pipeline, the trip and
/// its budget, the history, and the buttons this person may use now.
class TourDetailScreen extends StatefulWidget {
  const TourDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<TourDetailScreen> createState() => _TourDetailScreenState();
}

enum _Act { approve, reject, start, complete, cancel, note }

class _TourDetailScreenState extends State<TourDetailScreen> {
  late final ToursApi _api = ToursApi(context.read<ApiClient>());
  TourDetail? _tour;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final tour = await _api.tour(widget.id);
      if (mounted) setState(() => (_tour = tour, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  String _approveLabel(L l, TourDetail t) => switch (t.awaiting) {
    'VETTING' => t.isForeign ? l.tourActVet : l.tourActApproveSanction,
    'SANCTION' => l.tourActSanction,
    _ => l.tourActApprove,
  };

  Future<void> _act(_Act act) async {
    final l = L.of(context);
    final t = _tour!;
    final input = await showModalBottomSheet<_ActionInput>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AbgColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AbgRadii.sheet),
        ),
      ),
      builder: (_) =>
          _ActionSheet(act: act, tour: t, approveLabel: _approveLabel(l, t)),
    );
    if (input == null || !mounted) return;
    setState(() => _busy = true);
    final key = const Uuid().v4();
    try {
      final next = switch (act) {
        _Act.approve => await _api.decide(
          t.id,
          approve: true,
          note: input.note,
          sanctionedBudget: input.budget,
          idempotencyKey: key,
        ),
        _Act.reject => await _api.decide(
          t.id,
          approve: false,
          note: input.note,
          idempotencyKey: key,
        ),
        _Act.start => await _api.step(
          t.id,
          'start',
          note: input.note,
          idempotencyKey: key,
        ),
        _Act.complete => await _api.step(
          t.id,
          'complete',
          note: input.note,
          idempotencyKey: key,
        ),
        _Act.cancel => await _api.step(
          t.id,
          'cancel',
          note: input.note,
          idempotencyKey: key,
        ),
        _Act.note => await _api.step(
          t.id,
          'notes',
          note: input.note,
          idempotencyKey: key,
        ),
      };
      if (!mounted) return;
      setState(() => _tour = next);
      showSnack(context, switch (act) {
        _Act.approve =>
          next.status == 'APPROVED' ? l.tourDoneSanctioned : l.tourDoneApproved,
        _Act.reject => l.tourDoneRejected,
        _Act.start => l.tourDoneStarted,
        _Act.complete => l.tourDoneCompleted,
        _Act.cancel => l.tourDoneCancelled,
        _Act.note => l.tourDoneNote,
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      showSnack(context, e.isNetwork ? l.errorNetwork : e.message, error: true);
      // Someone else may have acted first: show where it stands now.
      if (e.isConflict) unawaited(_load());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = _tour;
    return Scaffold(
      appBar: AppBar(
        title: Text(t?.referenceNumber ?? l.tourTitle),
        actions: [
          if (t != null && t.can('ADD_NOTE'))
            IconButton(
              tooltip: l.tourActNote,
              icon: const Icon(Icons.add_comment_outlined),
              onPressed: _busy ? null : () => _act(_Act.note),
            ),
        ],
      ),
      body: _error != null
          ? Padding(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              child: ErrorPanel(error: _error!, onRetry: _load),
            )
          : t == null
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
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  AbgSpace.gutter,
                  8,
                  AbgSpace.gutter,
                  40,
                ),
                children: [
                  _Hero(tour: t),
                  if (t.passportAlert) ...[
                    const SizedBox(height: 14),
                    _Banner(
                      icon: Icons.warning_amber_rounded,
                      tone: Tone.danger,
                      title: l.tourPassportAlertTitle,
                      body: l.tourPassportAlertBody(
                        t.passportExpiry != null
                            ? tourDay(t.passportExpiry!, l.localeName)
                            : '—',
                        tourDay(t.endDate, l.localeName),
                      ),
                    ),
                  ],
                  if (t.blockedReason == 'SEPARATION_OF_DUTIES') ...[
                    const SizedBox(height: 14),
                    _Banner(
                      icon: Icons.info_outline_rounded,
                      tone: Tone.active,
                      body: l.tourSeparation,
                    ),
                  ],
                  if (t.status == 'APPROVED' &&
                      t.isTraveller &&
                      !t.can('START') &&
                      t.startableFrom != null) ...[
                    const SizedBox(height: 14),
                    _Banner(
                      icon: Icons.verified_outlined,
                      tone: Tone.success,
                      body: l.tourStartableFrom(
                        tourDay(t.startableFrom!, l.localeName),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  TourPipeline(stages: t.pipeline),
                  if (t.statusNote != null && t.statusNote!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _NoteCard(note: t.statusNote!),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.tourTrip),
                  _TripCard(tour: t),
                  const SizedBox(height: 22),
                  SectionTitle(l.tourBudgetSection),
                  _BudgetCard(tour: t),
                  const SizedBox(height: 22),
                  SectionTitle(l.tourCoTravellers),
                  _CoTravellers(tour: t),
                  const SizedBox(height: 22),
                  _PeopleCard(tour: t),
                  if (t.isForeign) ...[
                    const SizedBox(height: 22),
                    SectionTitle(l.tourPassportSection),
                    _PassportCard(tour: t),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.tourHistory),
                  _History(events: t.updates),
                ],
              ),
            ),
      bottomNavigationBar: t == null
          ? null
          : _ActionBar(
              tour: t,
              busy: _busy,
              approveLabel: _approveLabel(l, t),
              onAct: _act,
            ),
    );
  }
}

class _ActionInput {
  const _ActionInput(this.note, this.budget);
  final String? note;
  final int? budget;
}

/// Buttons from viewer.actions; the API re-checks every one.
class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.tour,
    required this.busy,
    required this.approveLabel,
    required this.onAct,
  });

  final TourDetail tour;
  final bool busy;
  final String approveLabel;
  final ValueChanged<_Act> onAct;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = tour;
    final buttons = <Widget>[];
    Widget secondary(
      String label,
      IconData icon,
      _Act act, {
      bool danger = false,
    }) => Expanded(
      child: OutlinedButton.icon(
        onPressed: busy ? null : () => onAct(act),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          foregroundColor: danger ? AbgColors.danger : AbgColors.navy,
          side: BorderSide(
            color: danger
                ? AbgColors.danger.withValues(alpha: 0.5)
                : AbgColors.borderStrong,
          ),
        ),
        icon: Icon(icon, size: 20),
        label: Text(label, overflow: TextOverflow.ellipsis),
      ),
    );
    Widget primary(String label, IconData icon, _Act act) => Expanded(
      child: FilledButton.icon(
        onPressed: busy ? null : () => onAct(act),
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
        icon: busy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: Colors.white,
                ),
              )
            : Icon(icon, size: 20),
        label: Text(label, overflow: TextOverflow.ellipsis),
      ),
    );

    if (t.can('APPROVE')) {
      buttons
        ..add(
          secondary(
            l.tourActReject,
            Icons.close_rounded,
            _Act.reject,
            danger: true,
          ),
        )
        ..add(primary(approveLabel, tourStatusIcon(t.status), _Act.approve));
    } else if (t.can('START')) {
      if (t.can('CANCEL')) {
        buttons.add(
          secondary(
            l.tourActCancel,
            Icons.block_rounded,
            _Act.cancel,
            danger: true,
          ),
        );
      }
      buttons.add(
        primary(l.tourActStart, Icons.flight_takeoff_rounded, _Act.start),
      );
    } else if (t.can('COMPLETE')) {
      buttons.add(
        primary(l.tourActComplete, Icons.flag_outlined, _Act.complete),
      );
    } else if (t.can('CANCEL')) {
      buttons.add(
        secondary(
          l.tourActCancel,
          Icons.block_rounded,
          _Act.cancel,
          danger: true,
        ),
      );
    }
    if (buttons.isEmpty) return const SizedBox.shrink();
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: const BoxDecoration(
          color: AbgColors.white,
          border: Border(top: BorderSide(color: AbgColors.border)),
        ),
        child: Row(
          children: [
            for (var i = 0; i < buttons.length; i++) ...[
              if (i > 0) const SizedBox(width: 10),
              buttons[i],
            ],
          ],
        ),
      ),
    );
  }
}

/// Asks for the note (required for reject / cancel) and, at vetting or
/// sanction, the amount to sanction.
class _ActionSheet extends StatefulWidget {
  const _ActionSheet({
    required this.act,
    required this.tour,
    required this.approveLabel,
  });

  final _Act act;
  final TourDetail tour;
  final String approveLabel;

  @override
  State<_ActionSheet> createState() => _ActionSheetState();
}

class _ActionSheetState extends State<_ActionSheet> {
  final _note = TextEditingController();
  late final _budget = TextEditingController(
    text: _withBudget
        ? '${widget.tour.sanctionedBudget ?? widget.tour.estimatedBudget}'
        : '',
  );
  String? _error;

  bool get _withBudget =>
      widget.act == _Act.approve &&
      widget.tour.awaiting != null &&
      widget.tour.awaiting != 'HOD';

  bool get _required =>
      widget.act == _Act.reject ||
      widget.act == _Act.cancel ||
      widget.act == _Act.note;

  @override
  void dispose() {
    _note.dispose();
    _budget.dispose();
    super.dispose();
  }

  void _confirm() {
    final l = L.of(context);
    final note = _note.text.trim();
    final min = widget.act == _Act.note ? 2 : TourLimits.reasonMin;
    if (_required && note.length < min) {
      setState(() => _error = l.tourReasonRequired);
      return;
    }
    final digits = _budget.text.replaceAll(RegExp(r'[^0-9]'), '');
    Navigator.pop(
      context,
      _ActionInput(
        note.isEmpty ? null : note,
        _withBudget && digits.isNotEmpty ? int.parse(digits) : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = widget.tour;
    final (
      String title,
      String hint,
      String label,
      bool danger,
    ) = switch (widget.act) {
      _Act.approve => (
        t.awaiting == 'HOD' ? l.tourApproveHod : widget.approveLabel,
        switch (t.awaiting) {
          'VETTING' => t.isForeign ? l.tourVetHint : l.tourVetLocalHint,
          'SANCTION' => l.tourSanctionHint,
          _ => l.tourApproveHodHint,
        },
        widget.approveLabel,
        false,
      ),
      _Act.reject => (l.tourActReject, l.tourRejectHint, l.tourActReject, true),
      _Act.start => (l.tourActStart, l.tourStartHint, l.tourActStart, false),
      _Act.complete => (
        l.tourActComplete,
        l.tourCompleteHint,
        l.tourActComplete,
        false,
      ),
      _Act.cancel => (l.tourActCancel, l.tourCancelHint, l.tourActCancel, true),
      _Act.note => (l.tourActNote, l.tourNoteHint, l.tourActNote, false),
    };
    final budget = int.tryParse(_budget.text.replaceAll(RegExp(r'[^0-9]'), ''));
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
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
            Text(title, style: AbgText.h2),
            const SizedBox(height: 4),
            Text(hint, style: AbgText.small),
            const SizedBox(height: 18),
            if (_withBudget) ...[
              TextField(
                controller: _budget,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  labelText: l.tourSanctionedBudget,
                  helperText:
                      '${l.tourBudgetEstimated}: ${formatTaka(t.estimatedBudget, l.localeName)}'
                      '${budget != null ? ' · ${formatTaka(budget, l.localeName)}' : ''}',
                  prefixIcon: const Icon(Icons.account_balance_wallet_outlined),
                ),
              ),
              const SizedBox(height: 14),
            ],
            TextField(
              controller: _note,
              autofocus: _required,
              minLines: 3,
              maxLines: 5,
              maxLength: TourLimits.noteMax,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) {
                if (_error != null) setState(() => _error = null);
              },
              decoration: InputDecoration(
                labelText: widget.act == _Act.note
                    ? l.tourNoteLabel
                    : _required
                    ? l.tourReason
                    : l.tourNoteOptional,
                errorText: _error,
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: _confirm,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: danger ? AbgColors.danger : AbgColors.navy,
              ),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.tour});
  final TourDetail tour;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = tour;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.xl),
        boxShadow: AbgShadows.raised,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TourTypeTag(t.type, onDark: true),
              TourStatusChip(t.status, dense: true, onDark: true),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            t.title,
            style: AbgText.h1.copyWith(color: Colors.white, fontSize: 22),
          ),
          const SizedBox(height: 10),
          _HeroLine(
            icon: t.isForeign ? Icons.public_rounded : Icons.place_outlined,
            text: t.place,
          ),
          _HeroLine(
            icon: Icons.event_outlined,
            text:
                '${tourDateRange(t.startDate, t.endDate, l.localeName)} · ${l.tourDays(t.durationDays)}',
          ),
          _HeroLine(icon: Icons.person_outline_rounded, text: t.traveller.name),
        ],
      ),
    );
  }
}

class _HeroLine extends StatelessWidget {
  const _HeroLine({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 4),
    child: Row(
      children: [
        Icon(icon, size: 16, color: AbgColors.platinumDeep),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: AbgText.small.copyWith(color: AbgColors.platinum),
          ),
        ),
      ],
    ),
  );
}

class _Banner extends StatelessWidget {
  const _Banner({
    required this.icon,
    required this.tone,
    required this.body,
    this.title,
  });

  final IconData icon;
  final Tone tone;
  final String? title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final c = toneColors(tone);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        border: Border.all(color: c.fg.withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: c.fg, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Text(
                    title!,
                    style: AbgText.bodyStrong.copyWith(
                      color: c.fg,
                      fontSize: 14,
                    ),
                  ),
                Text(body, style: AbgText.small.copyWith(color: c.fg)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NoteCard extends StatelessWidget {
  const _NoteCard({required this.note});
  final String note;

  @override
  Widget build(BuildContext context) => SectionCard(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.format_quote_rounded, color: AbgColors.navy500),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(L.of(context).tourLatestNote, style: AbgText.caption),
              const SizedBox(height: 2),
              Text(
                note,
                style: AbgText.body.copyWith(fontStyle: FontStyle.italic),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.tour});
  final TourDetail tour;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = tour;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InfoRow(
            icon: tourPurposeIcon(t.purpose),
            label: l.tourPurposeLabel,
            value: tourPurposeLabel(l, t.purpose),
          ),
          InfoRow(
            icon: t.isForeign ? Icons.public_rounded : Icons.place_outlined,
            label: l.tourDestinationLabel,
            value: t.place,
          ),
          InfoRow(
            icon: Icons.flight_takeoff_rounded,
            label: l.tourDeparture,
            value: tourDay(t.startDate, l.localeName),
          ),
          InfoRow(
            icon: Icons.flight_land_rounded,
            label: l.tourReturn,
            value: tourDay(t.endDate, l.localeName),
          ),
          InfoRow(
            icon: Icons.timelapse_rounded,
            label: l.tourDuration,
            value: l.tourDays(t.durationDays),
          ),
          InfoRow(
            icon: tourTransportIcon(t.transportMode),
            label: l.tourTransportLabel,
            value: tourTransportLabel(l, t.transportMode),
          ),
          InfoRow(
            icon: Icons.apartment_rounded,
            label: l.tourOffice,
            value: t.branchName,
          ),
          if (t.description.isNotEmpty) ...[
            const Divider(height: 24),
            Text(
              t.description,
              style: AbgText.body.copyWith(color: AbgColors.inkMuted),
            ),
          ],
        ],
      ),
    );
  }
}

class _BudgetCard extends StatelessWidget {
  const _BudgetCard({required this.tour});
  final TourDetail tour;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = tour;
    Widget row(
      String label,
      String value, {
      bool strong = false,
      Color? color,
    }) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: strong
                  ? AbgText.bodyStrong.copyWith(
                      fontSize: 14,
                      color: AbgColors.navy,
                    )
                  : AbgText.small,
            ),
          ),
          Text(
            value,
            style: AbgText.mono.copyWith(
              fontSize: strong ? 17 : 14,
              fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
              color: color ?? AbgColors.ink,
            ),
          ),
        ],
      ),
    );
    return SectionCard(
      child: Column(
        children: [
          row(
            l.tourBudgetEstimated,
            formatTaka(t.estimatedBudget, l.localeName),
          ),
          row(
            l.tourBudgetAdvance,
            t.advanceRequested > 0
                ? formatTaka(t.advanceRequested, l.localeName)
                : l.tourNone,
          ),
          const Divider(height: 18),
          row(
            l.tourBudgetSanctioned,
            t.sanctionedBudget != null
                ? formatTaka(t.sanctionedBudget, l.localeName)
                : l.tourNotYet,
            strong: true,
            color: t.sanctionedBudget != null
                ? AbgColors.success
                : AbgColors.inkSubtle,
          ),
        ],
      ),
    );
  }
}

class _CoTravellers extends StatelessWidget {
  const _CoTravellers({required this.tour});
  final TourDetail tour;

  @override
  Widget build(BuildContext context) {
    if (tour.coTravellers.isEmpty) {
      return SectionCard(
        child: Text(L.of(context).tourAlone, style: AbgText.small),
      );
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final c in tour.coTravellers)
          Chip(
            avatar: const Icon(Icons.person_outline_rounded, size: 18),
            label: Text(c),
            backgroundColor: AbgColors.white,
            side: const BorderSide(color: AbgColors.border),
          ),
      ],
    );
  }
}

class _PeopleCard extends StatelessWidget {
  const _PeopleCard({required this.tour});
  final TourDetail tour;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = tour;
    String describe(TourPersonRef p) =>
        [p.name, p.subtitle].where((s) => s.isNotEmpty).join(' · ');
    return SectionCard(
      child: Column(
        children: [
          InfoRow(
            icon: Icons.person_outline_rounded,
            label: l.tourTraveller,
            value: describe(t.traveller),
          ),
          InfoRow(
            icon: Icons.how_to_reg_outlined,
            label: l.tourHod,
            value: describe(t.approver),
          ),
        ],
      ),
    );
  }
}

class _PassportCard extends StatelessWidget {
  const _PassportCard({required this.tour});
  final TourDetail tour;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = tour;
    return SectionCard(
      child: Column(
        children: [
          InfoRow(
            icon: Icons.badge_outlined,
            label: l.tourPassportNumber,
            value: t.passportNumber ?? '—',
            valueStyle: AbgText.mono.copyWith(fontSize: 14),
          ),
          InfoRow(
            icon: Icons.event_available_outlined,
            label: l.tourValidUntil,
            value: t.passportExpiry != null
                ? tourDay(t.passportExpiry!, l.localeName)
                : '—',
            valueStyle: t.passportAlert
                ? AbgText.bodyStrong.copyWith(
                    fontSize: 14,
                    color: AbgColors.danger,
                  )
                : null,
          ),
        ],
      ),
    );
  }
}

class _History extends StatelessWidget {
  const _History({required this.events});
  final List<TourEvent> events;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final items = events.reversed.toList();
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Column(
        children: [
          for (var k = 0; k < items.length; k++) ...[
            if (k > 0) const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(_icon(items[k]), size: 20, color: _tone(items[k])),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _label(l, items[k]),
                          style: AbgText.bodyStrong.copyWith(fontSize: 14),
                        ),
                        Text(
                          '${items[k].actor} · ${dayAndTime(items[k].at, l.localeName)}',
                          style: AbgText.caption,
                        ),
                        if (items[k].note != null &&
                            items[k].note!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            items[k].note!,
                            style: AbgText.small.copyWith(color: AbgColors.ink),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _label(L l, TourEvent e) => switch (e.type) {
    'SUBMITTED' => l.tourEvSubmitted,
    'NOTE_ADDED' => l.tourEvNote,
    'BUDGET_CHANGED' => l.tourEvBudget(
      formatTaka((e.metadata['after'] as num?)?.toInt(), l.localeName),
    ),
    _ => switch (e.toStatus) {
      'PENDING_VETTING' => l.tourEvHod,
      'PENDING_SANCTION' => l.tourEvVetted,
      'APPROVED' =>
        e.fromStatus == 'PENDING_SANCTION'
            ? l.tourEvSanctioned
            : l.tourEvApproved,
      'REJECTED' => l.tourEvRejected,
      'ACTIVE' => l.tourEvStarted,
      'COMPLETED' => l.tourEvCompleted,
      'CANCELLED' => l.tourEvCancelled,
      _ => tourStatusLabel(l, e.toStatus ?? ''),
    },
  };

  IconData _icon(TourEvent e) => switch (e.type) {
    'SUBMITTED' => Icons.send_rounded,
    'NOTE_ADDED' => Icons.chat_bubble_outline_rounded,
    'BUDGET_CHANGED' => Icons.account_balance_wallet_outlined,
    _ => tourStatusIcon(e.toStatus ?? ''),
  };

  Color _tone(TourEvent e) => switch (e.type) {
    'STATUS_CHANGED' => switch (e.toStatus) {
      'REJECTED' => AbgColors.danger,
      'CANCELLED' => AbgColors.neutral,
      'ACTIVE' => AbgColors.active,
      _ => AbgColors.success,
    },
    'BUDGET_CHANGED' => AbgColors.success,
    _ => AbgColors.navy500,
  };
}
