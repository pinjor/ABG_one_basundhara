import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/module_kit.dart';
import '../../widgets/vocab.dart';
import 'appointment_api.dart';
import 'appointment_models.dart';
import 'appointment_widgets.dart';

/// One meeting request: its time, where it stands, any clash in the host's
/// diary, and the buttons this person may use (confirm, propose, decline,
/// accept, cancel, mark as held).
class AppointmentDetailScreen extends StatefulWidget {
  const AppointmentDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<AppointmentDetailScreen> createState() =>
      _AppointmentDetailScreenState();
}

enum _Act { confirm, propose, decline, accept, cancel, complete, note }

class _AppointmentDetailScreenState extends State<AppointmentDetailScreen> {
  late final AppointmentsApi _api = AppointmentsApi(context.read<ApiClient>());
  AppointmentDetail? _appt;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final appt = await _api.get(widget.id);
      if (mounted) setState(() => (_appt = appt, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _act(_Act act) async {
    final l = L.of(context);
    final a = _appt!;
    DateTime? at;
    String? location;
    String? note;
    switch (act) {
      case _Act.confirm:
      case _Act.propose:
        final input = await showAbgSheet<_TimeInput>(
          context,
          (_) => _TimeSheet(appt: a, propose: act == _Act.propose),
        );
        if (input == null) return;
        (at, location, note) = (input.at, input.location, input.note);
      case _Act.accept:
        note = '';
      case _Act.decline:
        note = await askNote(
          context,
          title: l.aptActDecline,
          hint: l.aptDeclineHint,
          confirm: l.aptActDecline,
          required: true,
          danger: true,
        );
      case _Act.cancel:
        note = await askNote(
          context,
          title: l.aptActCancel,
          hint: l.aptCancelHint,
          confirm: l.aptActCancel,
          required: true,
          danger: true,
        );
      case _Act.complete:
        note = await askNote(
          context,
          title: l.aptActComplete,
          hint: l.aptCompleteHint,
          confirm: l.aptActComplete,
        );
      case _Act.note:
        note = await askNote(
          context,
          title: l.kitAddNote,
          hint: l.kitAddNoteHint,
          confirm: l.kitAddNote,
          required: true,
          minLength: 2,
          label: l.kitNoteLabel,
        );
    }
    if (note == null || !mounted) return;
    setState(() => _busy = true);
    try {
      final next = await _api.step(
        a.id,
        switch (act) {
          _Act.confirm => 'confirm',
          _Act.propose => 'propose',
          _Act.decline => 'decline',
          _Act.accept => 'accept',
          _Act.cancel => 'cancel',
          _Act.complete => 'complete',
          _Act.note => 'notes',
        },
        at: at,
        location: location,
        note: note,
        idempotencyKey: const Uuid().v4(),
      );
      if (!mounted) return;
      setState(() => _appt = next);
      showSnack(context, switch (act) {
        _Act.confirm => l.aptDoneConfirmed,
        _Act.propose => l.aptDoneProposed,
        _Act.decline => l.aptDoneDeclined,
        _Act.accept => l.aptDoneAccepted,
        _Act.cancel => l.aptDoneCancelled,
        _Act.complete => l.aptDoneCompleted,
        _Act.note => l.kitNoteAdded,
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      showSnack(context, e.isNetwork ? l.errorNetwork : e.message, error: true);
      if (e.isConflict) unawaited(_load());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<ActionSpec> _actions(L l, AppointmentDetail a) {
    final out = <ActionSpec>[];
    if (a.can('COMPLETE')) {
      out.add(
        ActionSpec(
          l.aptActComplete,
          Icons.task_alt_rounded,
          () => _act(_Act.complete),
          primary: true,
        ),
      );
    }
    if (a.can('PROPOSE')) {
      out.add(
        ActionSpec(
          a.status == 'CONFIRMED' ? l.aptActReschedule : l.aptActPropose,
          Icons.update_rounded,
          () => _act(_Act.propose),
        ),
      );
    }
    if (a.can('DECLINE')) {
      out.add(
        ActionSpec(
          l.aptActDecline,
          Icons.event_busy_rounded,
          () => _act(_Act.decline),
          danger: true,
        ),
      );
    } else if (a.can('CANCEL')) {
      out.add(
        ActionSpec(
          l.aptActCancel,
          Icons.block_rounded,
          () => _act(_Act.cancel),
          danger: true,
        ),
      );
    }
    if (a.can('CONFIRM')) {
      out.add(
        ActionSpec(
          l.aptActConfirm,
          Icons.event_available_rounded,
          () => _act(_Act.confirm),
          primary: true,
        ),
      );
    }
    if (a.can('ACCEPT')) {
      out.add(
        ActionSpec(
          l.aptActAccept,
          Icons.check_rounded,
          () => _act(_Act.accept),
          primary: true,
        ),
      );
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = _appt;
    return Scaffold(
      appBar: AppBar(
        title: Text(a?.row.referenceNumber ?? l.aptTitle),
        actions: [
          if (a != null && a.can('ADD_NOTE'))
            IconButton(
              tooltip: l.kitAddNote,
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
          : a == null
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
                  _Hero(appt: a),
                  ..._banners(l, a),
                  const SizedBox(height: 16),
                  ProgressSteps(title: l.kitProgress, steps: _steps(l, a)),
                  if (a.row.statusNote != null &&
                      a.row.statusNote!.isNotEmpty &&
                      a.status != 'PROPOSED') ...[
                    const SizedBox(height: 16),
                    QuoteCard(label: l.kitLatestNote, text: a.row.statusNote!),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.aptMeeting),
                  _MeetingCard(appt: a),
                  const SizedBox(height: 22),
                  SectionTitle(l.aptTimesAsked),
                  _TimesCard(appt: a),
                  const SizedBox(height: 22),
                  SectionTitle(l.aptPeople),
                  _PeopleCard(appt: a),
                  const SizedBox(height: 22),
                  SectionTitle(l.kitHistory),
                  HistoryCard(
                    entries: [for (final e in a.updates) _entry(l, e)],
                  ),
                ],
              ),
            ),
      bottomNavigationBar: a == null
          ? null
          : BottomActions(busy: _busy, actions: _actions(l, a)),
    );
  }

  List<Widget> _banners(L l, AppointmentDetail a) {
    final out = <Widget>[];
    void add(Widget w) => out.addAll([const SizedBox(height: 14), w]);
    if (a.hostSide && a.clashes.isNotEmpty) {
      add(
        ToneBanner(
          icon: Icons.warning_amber_rounded,
          tone: Tone.danger,
          title: l.aptClashTitle,
          body: l.aptClashBody(
            a.row.host.name,
            a.clashes
                .map(
                  (c) =>
                      '${c.subject} (${c.withName}${c.at != null ? ', ${dayAndTime(c.at!, l.localeName)}' : ''})',
                )
                .join('; '),
          ),
        ),
      );
    }
    if (a.status == 'PROPOSED') {
      add(
        ToneBanner(
          icon: Icons.update_rounded,
          tone: Tone.pending,
          title: l.aptProposedBanner(
            a.respondedByName ?? a.row.host.name,
            meetingWhen(l, a.row.when, a.row.durationMinutes),
          ),
          body: [
            if (a.row.statusNote != null && a.row.statusNote!.isNotEmpty)
              '“${a.row.statusNote}”',
            if (a.isRequester) l.aptProposedAccept,
          ].join('\n'),
        ),
      );
    }
    if (a.status == 'CONFIRMED' && a.row.scheduledAt != null) {
      add(
        ToneBanner(
          icon: Icons.event_available_rounded,
          tone: Tone.success,
          body: l.aptConfirmedBanner(
            meetingWhen(l, a.row.scheduledAt!, a.row.durationMinutes),
          ),
        ),
      );
    }
    return out;
  }

  List<StepItem> _steps(L l, AppointmentDetail a) {
    final r = a.row;
    final answerer = a.row.host.executive
        ? '${r.host.name} · ${l.aptOfficeAnswers}'
        : r.host.name;
    final ended = r.status == 'DECLINED' || r.status == 'CANCELLED';
    final confirmedOnce = a.updates.any((u) => u.toStatus == 'CONFIRMED');
    final ending = a.updates.lastWhere(
      (u) => u.toStatus == r.status,
      orElse: () => AppointmentEvent(type: '', actor: '—', at: r.createdAt),
    );
    final answerState = switch (r.status) {
      'PENDING' || 'PROPOSED' => 'current',
      'DECLINED' => 'rejected',
      'CANCELLED' => confirmedOnce ? 'done' : 'cancelled',
      _ => 'done',
    };
    final meetingState = switch (r.status) {
      'CONFIRMED' => 'current',
      'COMPLETED' => 'done',
      'CANCELLED' => confirmedOnce ? 'cancelled' : 'skipped',
      'DECLINED' => 'skipped',
      _ => 'upcoming',
    };
    return [
      StepItem(
        label: l.aptStageAsked,
        state: 'done',
        icon: Icons.send_rounded,
        caption:
            '${r.requester.name} · ${dayAndTime(r.createdAt, l.localeName)}',
      ),
      StepItem(
        label: l.aptStageAnswer,
        state: answerState,
        icon: Icons.how_to_reg_outlined,
        caption: switch (answerState) {
          'current' =>
            r.status == 'PROPOSED'
                ? l.lvWaitingFor(r.requester.name)
                : l.lvWaitingFor(answerer),
          'rejected' => l.lvStageRejectedBy(ending.actor),
          'cancelled' => l.lvStageCancelledBy(ending.actor),
          _ => [
            a.respondedByName,
            if (confirmedOnce)
              dayAndTime(
                a.updates.firstWhere((u) => u.toStatus == 'CONFIRMED').at,
                l.localeName,
              ),
          ].whereType<String>().join(' · '),
        },
      ),
      StepItem(
        label: l.aptStageMeeting,
        state: meetingState,
        icon: Icons.groups_outlined,
        caption: switch (meetingState) {
          'current' || 'done' =>
            r.scheduledAt != null
                ? meetingWhen(l, r.scheduledAt!, r.durationMinutes)
                : '',
          'cancelled' => l.lvStageCancelledBy(ending.actor),
          'skipped' => ended ? l.lvStageSkipped : '',
          _ => '',
        },
      ),
    ];
  }

  HistoryEntry _entry(L l, AppointmentEvent e) {
    final (String title, IconData icon, Color color) = switch (e.type) {
      'SUBMITTED' => (l.aptEvSubmitted, Icons.send_rounded, AbgColors.navy500),
      'NOTE_ADDED' => (
        l.aptEvNote,
        Icons.chat_bubble_outline_rounded,
        AbgColors.navy500,
      ),
      'TIME_PROPOSED' => (
        l.aptEvProposed(
          e.scheduledAt != null
              ? dayAndTime(e.scheduledAt!, l.localeName)
              : '—',
        ),
        Icons.update_rounded,
        AbgColors.pending,
      ),
      _ => switch (e.toStatus) {
        'CONFIRMED' => (
          l.aptEvConfirmed,
          Icons.event_available_rounded,
          AbgColors.success,
        ),
        'DECLINED' => (
          l.aptEvDeclined,
          Icons.event_busy_rounded,
          AbgColors.danger,
        ),
        'CANCELLED' => (
          l.aptEvCancelled,
          Icons.block_rounded,
          AbgColors.neutral,
        ),
        'COMPLETED' => (
          l.aptEvCompleted,
          Icons.task_alt_rounded,
          AbgColors.active,
        ),
        _ => (
          appointmentStatusLabel(l, e.toStatus ?? ''),
          Icons.circle_outlined,
          AbgColors.navy500,
        ),
      },
    };
    return HistoryEntry(
      icon: icon,
      color: color,
      title: title,
      actor: e.actor,
      at: e.at,
      note: e.note,
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.appt});
  final AppointmentDetail appt;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = appt.row;
    return ModuleHero(
      chips: [
        AppointmentStatusChip(r.status, dense: true, onDark: true),
        if (r.urgent && r.isOpen)
          ToneBadge(
            label: l.aptUrgent,
            tone: Tone.danger,
            icon: Icons.bolt_rounded,
            dense: true,
            onDark: true,
          ),
      ],
      title: r.subject,
      lines: [
        (Icons.event_outlined, meetingWhen(l, r.when, r.durationMinutes)),
        (
          Icons.person_outline_rounded,
          appt.hostSide ? l.aptFrom(r.requester.name) : l.aptWith(r.host.name),
        ),
        (
          meetingModeIcon(r.mode),
          [
            meetingModeLabel(l, r.mode),
            if (r.location != null && r.location!.isNotEmpty) r.location!,
          ].join(' · '),
        ),
      ],
    );
  }
}

class _MeetingCard extends StatelessWidget {
  const _MeetingCard({required this.appt});
  final AppointmentDetail appt;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = appt;
    final r = a.row;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InfoRow(
            icon: appointmentPurposeIcon(r.purpose),
            label: l.aptPurposeLabel,
            value: appointmentPurposeLabel(l, r.purpose),
          ),
          InfoRow(
            icon: Icons.event_outlined,
            label: l.aptWhen,
            value: meetingWhen(l, r.when, r.durationMinutes),
          ),
          InfoRow(
            icon: Icons.timelapse_rounded,
            label: l.aptLength,
            value: l.aptMinutes(r.durationMinutes),
          ),
          InfoRow(
            icon: meetingModeIcon(r.mode),
            label: l.aptModeLabel,
            value: meetingModeLabel(l, r.mode),
          ),
          if (r.location != null && r.location!.isNotEmpty)
            InfoRow(
              icon: Icons.place_outlined,
              label: l.aptLocation,
              value: r.location!,
            ),
          if (a.attendees.isNotEmpty)
            InfoRow(
              icon: Icons.groups_outlined,
              label: l.aptJoining,
              value: a.attendees.join(', '),
            ),
          if (a.agenda.isNotEmpty) ...[
            const Divider(height: 24),
            Text(l.aptAgenda, style: AbgText.caption),
            const SizedBox(height: 4),
            Text(
              a.agenda,
              style: AbgText.body.copyWith(color: AbgColors.inkMuted),
            ),
          ],
        ],
      ),
    );
  }
}

class _TimesCard extends StatelessWidget {
  const _TimesCard({required this.appt});
  final AppointmentDetail appt;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = appt.row;
    return SectionCard(
      child: Column(
        children: [
          InfoRow(
            icon: Icons.looks_one_outlined,
            label: l.aptPreferredShort,
            value: meetingWhen(l, r.preferredAt, r.durationMinutes),
          ),
          if (r.alternativeAt != null)
            InfoRow(
              icon: Icons.looks_two_outlined,
              label: l.aptAlternativeShort,
              value: meetingWhen(l, r.alternativeAt!, r.durationMinutes),
            ),
        ],
      ),
    );
  }
}

class _PeopleCard extends StatelessWidget {
  const _PeopleCard({required this.appt});
  final AppointmentDetail appt;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = appt.row;
    String describe(AppointmentPerson p) =>
        [p.name, p.subtitle].where((s) => s.isNotEmpty).join(' · ');
    return SectionCard(
      child: Column(
        children: [
          InfoRow(
            icon: Icons.person_outline_rounded,
            label: l.aptRequester,
            value: describe(r.requester),
            trailing: r.requester.phone == null
                ? null
                : Text(r.requester.phone!, style: AbgText.caption),
          ),
          InfoRow(
            icon: r.host.executive
                ? Icons.star_outline_rounded
                : Icons.how_to_reg_outlined,
            label: l.aptHost,
            value: describe(r.host),
          ),
          if (appt.respondedByName != null)
            InfoRow(
              icon: Icons.support_agent_rounded,
              label: l.aptAnsweredBy,
              value: appt.respondedByName!,
            ),
        ],
      ),
    );
  }
}

class _TimeInput {
  const _TimeInput(this.at, this.location, this.note);
  final DateTime? at;
  final String? location;
  final String note;
}

/// Confirm (one of the times asked for) or propose (a new time), with the
/// place and a note — required when proposing.
class _TimeSheet extends StatefulWidget {
  const _TimeSheet({required this.appt, required this.propose});

  final AppointmentDetail appt;
  final bool propose;

  @override
  State<_TimeSheet> createState() => _TimeSheetState();
}

class _TimeSheetState extends State<_TimeSheet> {
  late final _location = TextEditingController(
    text: widget.appt.row.location ?? '',
  );
  final _note = TextEditingController();
  late DateTime? _at = widget.propose ? null : widget.appt.row.preferredAt;
  String? _error;

  @override
  void dispose() {
    _location.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final l = L.of(context);
    final at = await pickMeetingTime(
      context,
      initial: _at ?? widget.appt.row.when,
      help: l.aptNewTime,
    );
    if (at != null && mounted) setState(() => (_at = at, _error = null));
  }

  void _done() {
    final l = L.of(context);
    final r = widget.appt.row;
    if (_at == null) {
      setState(() => _error = l.aptErrTime);
      return;
    }
    final problem = meetingTimeProblem(_at!, r.durationMinutes);
    if (problem != null && (widget.propose || _at != r.preferredAt)) {
      setState(() => _error = meetingProblemText(l, problem));
      return;
    }
    final note = _note.text.trim();
    if (widget.propose && note.length < AppointmentLimits.reasonMin) {
      setState(() => _error = l.kitReasonRequired);
      return;
    }
    Navigator.pop(
      context,
      _TimeInput(
        // Confirming the preferred time sends no time: the API takes it.
        !widget.propose && _at == r.preferredAt ? null : _at,
        _location.text.trim(),
        note,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = widget.appt.row;
    final rescheduling = widget.propose && r.status == 'CONFIRMED';
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SheetHeader(
              title: widget.propose
                  ? (rescheduling ? l.aptActReschedule : l.aptProposeTitle)
                  : l.aptConfirmTitle,
              hint: widget.propose ? l.aptProposeHint : l.aptConfirmHint,
            ),
            if (!widget.propose) ...[
              for (final (label, at) in [
                (l.aptPreferredShort, r.preferredAt),
                if (r.alternativeAt != null)
                  (l.aptAlternativeShort, r.alternativeAt!),
              ])
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _TimeOption(
                    label: label,
                    text: meetingWhen(l, at, r.durationMinutes),
                    selected: _at == at,
                    onTap: () => setState(() => (_at = at, _error = null)),
                  ),
                ),
            ] else
              PickerTile(
                icon: Icons.event_repeat_rounded,
                placeholder: _at == null,
                label: _at == null
                    ? l.aptPickTime
                    : meetingWhen(l, _at!, r.durationMinutes),
                onTap: _pick,
              ),
            const SizedBox(height: 6),
            Text(l.aptHoursNote, style: AbgText.caption),
            const SizedBox(height: 14),
            TextField(
              controller: _location,
              maxLength: AppointmentLimits.locationMax,
              decoration: InputDecoration(
                labelText: l.aptLocationLabel,
                hintText: l.aptLocationHint,
                prefixIcon: Icon(meetingModeIcon(r.mode)),
              ),
            ),
            const SizedBox(height: 4),
            TextField(
              controller: _note,
              minLines: 2,
              maxLines: 4,
              maxLength: AppointmentLimits.noteMax,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) {
                if (_error != null) setState(() => _error = null);
              },
              decoration: InputDecoration(
                labelText: widget.propose
                    ? l.aptProposeReason
                    : l.kitNoteOptional,
                alignLabelWithHint: true,
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 4),
              Text(
                _error!,
                style: AbgText.small.copyWith(color: AbgColors.danger),
              ),
            ],
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _done,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
              child: Text(widget.propose ? l.aptSend : l.aptActConfirm),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimeOption extends StatelessWidget {
  const _TimeOption({
    required this.label,
    required this.text,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    selected: selected,
    button: true,
    child: Material(
      color: selected ? AbgColors.navy : AbgColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AbgRadii.md),
        side: BorderSide(color: selected ? AbgColors.navy : AbgColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AbgRadii.md),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: selected ? Colors.white : AbgColors.inkSubtle,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: AbgText.caption.copyWith(
                        color: selected
                            ? AbgColors.platinum
                            : AbgColors.inkMuted,
                      ),
                    ),
                    Text(
                      text,
                      style: AbgText.bodyStrong.copyWith(
                        fontSize: 14.5,
                        color: selected ? Colors.white : AbgColors.ink,
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
  );
}
