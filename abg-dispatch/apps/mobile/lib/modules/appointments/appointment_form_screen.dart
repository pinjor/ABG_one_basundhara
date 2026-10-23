import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/module_kit.dart';
import '../../widgets/vocab.dart';
import 'appointment_api.dart';
import 'appointment_models.dart';
import 'appointment_widgets.dart';

/// Ask the MD, the Chairman, a head of department or a colleague for a
/// meeting: who, what about, how and how long, and two times that suit.
class AppointmentFormScreen extends StatefulWidget {
  const AppointmentFormScreen({super.key});

  @override
  State<AppointmentFormScreen> createState() => _AppointmentFormScreenState();
}

class _AppointmentFormScreenState extends State<AppointmentFormScreen> {
  // One key per form: a retried submit never files the request twice.
  final _idempotencyKey = const Uuid().v4();
  late final AppointmentsApi _api = AppointmentsApi(context.read<ApiClient>());
  final _subject = TextEditingController();
  final _agenda = TextEditingController();
  final _attendee = TextEditingController();
  AppointmentHost? _host;
  String _purpose = 'BUSINESS_REVIEW';
  String _mode = 'IN_PERSON';
  int _duration = 30;
  DateTime? _preferred;
  DateTime? _alternative;
  final _attendees = <String>[];
  bool _urgent = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _subject.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _subject.dispose();
    _agenda.dispose();
    _attendee.dispose();
    super.dispose();
  }

  String? _problem(L l) {
    if (_host == null) return l.aptErrHost;
    if (_subject.text.trim().length < AppointmentLimits.subjectMin) {
      return l.aptErrSubject;
    }
    if (_preferred == null) return l.aptErrTime;
    final p = meetingTimeProblem(_preferred!, _duration);
    if (p != null) return meetingProblemText(l, p);
    if (_alternative != null) {
      final a = meetingTimeProblem(_alternative!, _duration);
      if (a != null) return meetingProblemText(l, a);
      if (_alternative == _preferred) return l.aptErrSame;
    }
    return null;
  }

  Future<void> _chooseHost() async {
    final picked = await pickHost(context, _api);
    if (picked != null && mounted) setState(() => _host = picked);
  }

  Future<void> _pick({required bool alternative}) async {
    final l = L.of(context);
    final at = await pickMeetingTime(
      context,
      initial: alternative ? (_alternative ?? _preferred) : _preferred,
      help: alternative ? l.aptAlternative : l.aptPreferred,
    );
    if (at == null || !mounted) return;
    setState(() => alternative ? _alternative = at : _preferred = at);
  }

  void _addAttendee() {
    final name = _attendee.text.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (name.length >= 2 &&
        _attendees.length < AppointmentLimits.maxAttendees &&
        !_attendees.any((a) => a.toLowerCase() == name.toLowerCase())) {
      setState(() => _attendees.add(name));
    }
    _attendee.clear();
  }

  Future<void> _submit() async {
    final l = L.of(context);
    final problem = _problem(l);
    if (problem != null) {
      showSnack(context, problem, error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      final appt = await _api.create({
        'hostUserId': _host!.userId,
        'subject': _subject.text.trim(),
        'purpose': _purpose,
        if (_agenda.text.trim().isNotEmpty) 'agenda': _agenda.text.trim(),
        'mode': _mode,
        'durationMinutes': _duration,
        'preferredAt': _preferred!.toUtc().toIso8601String(),
        if (_alternative != null)
          'alternativeAt': _alternative!.toUtc().toIso8601String(),
        'attendees': _attendees,
        'urgent': _urgent,
      }, _idempotencyKey);
      if (!mounted) return;
      showSnack(context, l.aptSubmitted(appt.row.referenceNumber));
      context.pushReplacement('/appointments/${appt.id}');
    } on ApiException catch (e) {
      if (mounted) {
        showSnack(
          context,
          e.isNetwork ? l.kitOfflineNotice : e.message,
          error: true,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final preferredProblem = _preferred == null
        ? null
        : meetingTimeProblem(_preferred!, _duration);
    final alternativeProblem = _alternative == null
        ? null
        : meetingTimeProblem(_alternative!, _duration);
    return Scaffold(
      appBar: AppBar(title: Text(l.aptRequest)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          8,
          AbgSpace.gutter,
          32,
        ),
        children: [
          IntroBanner(icon: Icons.event_rounded, text: l.aptFormIntro),
          const SizedBox(height: 22),
          SectionTitle(l.aptWhoSection),
          _HostField(host: _host, onChoose: _busy ? null : _chooseHost),
          const SizedBox(height: 22),
          SectionTitle(l.aptAboutSection),
          TextField(
            controller: _subject,
            maxLength: AppointmentLimits.subjectMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: '${l.aptSubjectLabel} *',
              hintText: l.aptSubjectHint,
            ),
          ),
          const SizedBox(height: 4),
          IconChoiceChips<String>(
            values: appointmentPurposes,
            selected: _purpose,
            label: (p) => appointmentPurposeLabel(l, p),
            icon: appointmentPurposeIcon,
            onSelected: (p) => setState(() => _purpose = p),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _agenda,
            minLines: 2,
            maxLines: 5,
            maxLength: AppointmentLimits.agendaMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l.aptAgendaLabel,
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 14),
          SectionTitle(l.aptHowSection),
          IconChoiceChips<String>(
            values: meetingModes,
            selected: _mode,
            label: (m) => meetingModeLabel(l, m),
            icon: meetingModeIcon,
            onSelected: (m) => setState(() => _mode = m),
          ),
          const SizedBox(height: 10),
          IconChoiceChips<int>(
            values: appointmentDurations,
            selected: _duration,
            label: (d) => l.aptMinutes(d),
            onSelected: (d) => setState(() => _duration = d),
          ),
          const SizedBox(height: 22),
          SectionTitle(l.aptWhenSection),
          PickerTile(
            icon: Icons.event_available_rounded,
            placeholder: _preferred == null,
            label: _preferred == null
                ? '${l.aptPreferred} *'
                : meetingWhen(l, _preferred!, _duration),
            onTap: _busy ? null : () => _pick(alternative: false),
          ),
          if (preferredProblem != null) _TimeProblem(code: preferredProblem),
          const SizedBox(height: 10),
          PickerTile(
            icon: Icons.event_repeat_rounded,
            placeholder: _alternative == null,
            label: _alternative == null
                ? l.aptAlternative
                : meetingWhen(l, _alternative!, _duration),
            onTap: _busy ? null : () => _pick(alternative: true),
          ),
          if (alternativeProblem != null)
            _TimeProblem(code: alternativeProblem),
          const SizedBox(height: 6),
          Text(l.aptHoursNote, style: AbgText.caption),
          const SizedBox(height: 22),
          SectionTitle(l.aptAttendees),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _attendee,
                  maxLength: AppointmentLimits.attendeeNameMax,
                  textCapitalization: TextCapitalization.words,
                  onSubmitted: (_) => _addAttendee(),
                  decoration: InputDecoration(
                    hintText: l.aptAttendeeHint,
                    counterText: '',
                    prefixIcon: const Icon(Icons.person_add_alt_outlined),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: _addAttendee,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(64, 52),
                ),
                child: Text(l.aptAdd),
              ),
            ],
          ),
          if (_attendees.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final a in _attendees)
                  InputChip(
                    label: Text(a),
                    onDeleted: () => setState(() => _attendees.remove(a)),
                    backgroundColor: AbgColors.white,
                    side: const BorderSide(color: AbgColors.border),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 18),
          SectionCard(
            padding: const EdgeInsets.fromLTRB(14, 4, 8, 4),
            child: SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _urgent,
              onChanged: (v) => setState(() => _urgent = v),
              secondary: Icon(
                Icons.bolt_rounded,
                color: _urgent ? AbgColors.danger : AbgColors.inkSubtle,
              ),
              title: Text(
                l.aptUrgentSwitch,
                style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
              ),
              subtitle: Text(l.aptUrgentHint, style: AbgText.caption),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SubmitBar(
        label: l.aptSubmit,
        busy: _busy,
        onPressed: _submit,
      ),
    );
  }
}

class _HostField extends StatelessWidget {
  const _HostField({required this.host, required this.onChoose});

  final AppointmentHost? host;
  final VoidCallback? onChoose;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final h = host;
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      onTap: onChoose,
      child: Row(
        children: [
          h == null
              ? Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AbgColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(color: AbgColors.border),
                  ),
                  child: const Icon(
                    Icons.person_search_rounded,
                    color: AbgColors.inkSubtle,
                  ),
                )
              : HostAvatar(host: h),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  h?.name ?? l.aptChooseHost,
                  style: AbgText.bodyStrong.copyWith(
                    fontSize: 15,
                    color: h == null ? AbgColors.inkMuted : AbgColors.ink,
                  ),
                ),
                if (h != null && h.subtitle.isNotEmpty)
                  Text(h.subtitle, style: AbgText.caption),
                if (h != null && h.executive) ...[
                  const SizedBox(height: 4),
                  Text(
                    l.aptOfficeAnswers,
                    style: AbgText.caption.copyWith(color: AbgColors.active),
                  ),
                ],
              ],
            ),
          ),
          TextButton(
            onPressed: onChoose,
            style: TextButton.styleFrom(
              minimumSize: const Size(kMinTap, kMinTap),
            ),
            child: Text(h != null ? l.kitChange : l.kitChoose),
          ),
        ],
      ),
    );
  }
}

class _TimeProblem extends StatelessWidget {
  const _TimeProblem({required this.code});
  final String code;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 6),
    child: ToneBanner(
      icon: Icons.schedule_rounded,
      tone: Tone.danger,
      body: meetingProblemText(L.of(context), code),
    ),
  );
}
