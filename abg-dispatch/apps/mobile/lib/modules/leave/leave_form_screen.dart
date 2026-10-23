import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/module_kit.dart';
import '../../widgets/vocab.dart';
import 'leave_api.dart';
import 'leave_models.dart';
import 'leave_widgets.dart';

/// Apply for leave: the type (with what is left of it), the days — counted
/// as the API counts them — the reason, who covers, and who approves first.
class LeaveFormScreen extends StatefulWidget {
  const LeaveFormScreen({super.key, this.initialType});

  final String? initialType;

  @override
  State<LeaveFormScreen> createState() => _LeaveFormScreenState();
}

class _LeaveFormScreenState extends State<LeaveFormScreen> {
  // One key per form: a retried submit never files the application twice.
  final _idempotencyKey = const Uuid().v4();
  late final LeaveApi _api = LeaveApi(context.read<ApiClient>());
  final _reason = TextEditingController();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  late String _type = leaveTypes.contains(widget.initialType)
      ? widget.initialType!
      : 'CASUAL';
  DateTime? _start;
  DateTime? _end;
  bool _halfDay = false;
  String _session = 'FIRST_HALF';
  PickedPerson? _reliever;
  PickedPerson? _approver;
  String? _managerProblem;
  LeaveCalendar _calendar = LeaveCalendar.fallback;
  Map<String, LeaveBalance> _balances = {};
  bool _busy = false;

  LeaveRule get _rule => leaveRules[_type]!;

  @override
  void initState() {
    super.initState();
    final manager = context.read<SessionController>().profile?.manager;
    if (manager != null && manager.hasAccount) {
      _approver = PickedPerson(
        employeeId: manager.employeeId,
        name: manager.fullName,
        designation: manager.designation,
      );
    } else if (manager != null) {
      _managerProblem = manager.fullName;
    }
    _reason.addListener(() => setState(() {}));
    unawaited(_loadContext());
  }

  @override
  void dispose() {
    _reason.dispose();
    _address.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _loadContext() async {
    try {
      final results = await Future.wait<Object>([
        _api.calendar(),
        _api.balance(),
      ]);
      if (!mounted) return;
      final balance = results[1] as ({int year, List<LeaveBalance> balances});
      setState(() {
        _calendar = results[0] as LeaveCalendar;
        _balances = {for (final b in balance.balances) b.type: b};
      });
    } catch (_) {
      // The form still works; the API checks the balance on submit.
    }
  }

  DateTime _dateOnly(DateTime d) => DateTime.utc(d.year, d.month, d.day);

  double get _days => _start == null
      ? 0
      : countLeaveDays(
          _start!,
          _end ?? _start!,
          type: _type,
          calendar: _calendar,
          halfDay: _halfDay ? _session : null,
        );

  /// The first thing stopping a submit, or null when the form is complete.
  String? _problem(L l) {
    final label = leaveTypeLabel(l, _type);
    if (_start == null) return l.lvErrDates;
    final earliest = earliestLeaveStart(_type);
    if (_start!.isBefore(earliest)) {
      return _rule.backdateDays > 0
          ? l.lvBackdate(label, '${_rule.backdateDays}')
          : l.lvNoticeShort(
              label,
              '${_rule.noticeDays}',
              tourDay(earliest, l.localeName),
            );
    }
    final days = _days;
    if (days <= 0) return l.lvNoWorkingDays;
    if (_rule.maxPerRequest != null && days > _rule.maxPerRequest!) {
      return l.lvTooMany(label, leaveDays(l, _rule.maxPerRequest!.toDouble()));
    }
    final b = _balances[_type];
    if (b?.available != null && days > b!.available!) {
      return l.lvInsufficient(
        leaveDays(l, b.available!),
        label.toLowerCase(),
        leaveDays(l, days),
      );
    }
    if (_reason.text.trim().length < LeaveLimits.reasonMin) {
      return l.lvErrReason;
    }
    if (_approver == null) return l.lvErrApprover;
    return null;
  }

  void _selectType(String t) {
    setState(() {
      _type = t;
      if (!_rule.halfDayAllowed) _halfDay = false;
    });
  }

  Future<void> _pickDates() async {
    final l = L.of(context);
    final today = dhakaToday();
    final earliest = earliestLeaveStart(_type);
    final first = DateTime(earliest.year, earliest.month, earliest.day);
    final last = DateTime(
      today.year,
      today.month,
      today.day,
    ).add(const Duration(days: LeaveLimits.maxLeadDays + 120));
    if (_halfDay) {
      final picked = await showDatePicker(
        context: context,
        firstDate: first,
        lastDate: last,
        initialDate: _start != null && !_start!.isBefore(earliest)
            ? DateTime(_start!.year, _start!.month, _start!.day)
            : first,
        helpText: l.lvPickDay,
      );
      if (picked != null && mounted) {
        setState(() => _start = _end = _dateOnly(picked));
      }
      return;
    }
    final picked = await showDateRangePicker(
      context: context,
      firstDate: first,
      lastDate: last,
      initialDateRange:
          _start != null && _end != null && !_start!.isBefore(earliest)
          ? DateTimeRange(
              start: DateTime(_start!.year, _start!.month, _start!.day),
              end: DateTime(_end!.year, _end!.month, _end!.day),
            )
          : null,
      helpText: l.lvPickDates,
    );
    if (picked != null && mounted) {
      setState(() {
        _start = _dateOnly(picked.start);
        _end = _dateOnly(picked.end);
      });
    }
  }

  Future<void> _chooseReliever() async {
    final l = L.of(context);
    final picked = await pickPerson(
      context,
      title: l.lvChooseReliever,
      hint: l.lvRelieverHint,
      needsAccount: false,
    );
    if (picked != null && mounted) setState(() => _reliever = picked);
  }

  Future<void> _chooseApprover() async {
    final l = L.of(context);
    final picked = await pickPerson(
      context,
      title: l.lvChooseApprover,
      hint: l.lvApproverHint,
    );
    if (picked != null && mounted) {
      setState(() => (_approver = picked, _managerProblem = null));
    }
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
      final leave = await _api.apply({
        'type': _type,
        'startDate': isoDay(_start!),
        'endDate': isoDay(_halfDay ? _start! : (_end ?? _start!)),
        if (_halfDay) 'halfDay': _session,
        'reason': _reason.text.trim(),
        if (_address.text.trim().isNotEmpty)
          'addressDuringLeave': _address.text.trim(),
        if (_phone.text.trim().isNotEmpty) 'contactPhone': _phone.text.trim(),
        if (_reliever != null) 'relieverEmployeeId': _reliever!.employeeId,
        'approverEmployeeId': _approver!.employeeId,
      }, _idempotencyKey);
      if (!mounted) return;
      showSnack(context, l.lvSubmitted(leave.row.referenceNumber));
      context.pushReplacement('/leave/${leave.id}');
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
    return Scaffold(
      appBar: AppBar(title: Text(l.lvApply)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          8,
          AbgSpace.gutter,
          32,
        ),
        children: [
          IntroBanner(icon: Icons.beach_access_rounded, text: l.lvFormIntro),
          const SizedBox(height: 22),
          SectionTitle(l.lvTypeSection),
          for (final t in leaveTypes)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _TypeOption(
                type: t,
                balance: _balances[t],
                selected: _type == t,
                onTap: () => _selectType(t),
              ),
            ),
          const SizedBox(height: 14),
          SectionTitle(l.lvDatesSection),
          if (_rule.halfDayAllowed) ...[
            SectionCard(
              padding: const EdgeInsets.fromLTRB(14, 4, 8, 4),
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _halfDay,
                title: Text(
                  l.lvHalfDaySwitch,
                  style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                ),
                onChanged: (v) => setState(() {
                  _halfDay = v;
                  if (v && _start != null) _end = _start;
                }),
              ),
            ),
            if (_halfDay) ...[
              const SizedBox(height: 10),
              IconChoiceChips<String>(
                values: const ['FIRST_HALF', 'SECOND_HALF'],
                selected: _session,
                label: (s) => halfDayLabel(l, s),
                icon: (s) => s == 'FIRST_HALF'
                    ? Icons.wb_twilight_rounded
                    : Icons.wb_sunny_rounded,
                onSelected: (s) => setState(() => _session = s),
              ),
            ],
            const SizedBox(height: 10),
          ],
          PickerTile(
            icon: Icons.date_range_rounded,
            placeholder: _start == null,
            label: _start == null
                ? (_halfDay ? l.lvPickDay : l.lvPickDates)
                : leaveWhen(
                    l,
                    _start!,
                    _end ?? _start!,
                    _halfDay ? _session : null,
                  ),
            trailing: _start == null ? null : leaveDays(l, _days),
            onTap: _busy ? null : _pickDates,
          ),
          if (_start != null) ...[
            const SizedBox(height: 10),
            _CountCard(
              type: _type,
              start: _start!,
              end: _halfDay ? _start! : (_end ?? _start!),
              days: _days,
              balance: _balances[_type],
              calendar: _calendar,
              problem: _problem(l),
            ),
          ],
          const SizedBox(height: 22),
          TextField(
            controller: _reason,
            minLines: 2,
            maxLines: 4,
            maxLength: LeaveLimits.reasonMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: '${l.lvReasonLabel} *',
              hintText: l.lvReasonHint,
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 14),
          SectionTitle(l.lvPeople),
          if (_managerProblem != null) ...[
            ToneBanner(
              icon: Icons.info_outline_rounded,
              tone: Tone.pending,
              body: l.lvApproverMissing(_managerProblem!),
            ),
            const SizedBox(height: 10),
          ],
          PersonField(
            label: l.lvApprover,
            name: _approver?.name,
            subtitle: _approver?.subtitle,
            emptyText: l.lvChooseApprover,
            onChoose: _busy ? null : _chooseApprover,
          ),
          const SizedBox(height: 10),
          PersonField(
            label: l.lvReliever,
            name: _reliever?.name,
            subtitle: _reliever?.subtitle,
            emptyText: l.lvRelieverEmpty,
            onChoose: _busy ? null : _chooseReliever,
            onClear: () => setState(() => _reliever = null),
          ),
          const SizedBox(height: 22),
          SectionTitle(l.lvMoreSection),
          TextField(
            controller: _address,
            maxLength: LeaveLimits.addressMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l.lvAddress,
              prefixIcon: const Icon(Icons.home_outlined),
            ),
          ),
          const SizedBox(height: 4),
          TextField(
            controller: _phone,
            maxLength: 20,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              labelText: l.lvPhone,
              prefixIcon: const Icon(Icons.call_outlined),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SubmitBar(
        label: l.lvSubmit,
        busy: _busy,
        onPressed: _submit,
      ),
    );
  }
}

/// A leave type with its rule and what is left of it this year.
class _TypeOption extends StatelessWidget {
  const _TypeOption({
    required this.type,
    required this.selected,
    required this.onTap,
    this.balance,
  });

  final String type;
  final LeaveBalance? balance;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final b = balance;
    return Semantics(
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
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            child: Row(
              children: [
                LeaveTypeIcon(type, size: 36),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        leaveTypeLabel(l, type),
                        style: AbgText.bodyStrong.copyWith(
                          fontSize: 14.5,
                          color: selected ? Colors.white : AbgColors.ink,
                        ),
                      ),
                      Text(
                        leaveTypeHint(l, type),
                        style: AbgText.caption.copyWith(
                          color: selected
                              ? AbgColors.platinum
                              : AbgColors.inkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                if (b != null && b.available != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: selected
                          ? Colors.white.withValues(alpha: 0.12)
                          : b.available! > 0
                          ? AbgColors.successSoft
                          : AbgColors.dangerSoft,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${leaveNumber(b.available!)} ${l.lvLeft}',
                      style: AbgText.caption.copyWith(
                        fontWeight: FontWeight.w800,
                        color: selected
                            ? Colors.white
                            : b.available! > 0
                            ? AbgColors.success
                            : AbgColors.danger,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// How the days were counted and what is left afterwards.
class _CountCard extends StatelessWidget {
  const _CountCard({
    required this.type,
    required this.start,
    required this.end,
    required this.days,
    required this.calendar,
    required this.problem,
    this.balance,
  });

  final String type;
  final DateTime start;
  final DateTime end;
  final double days;
  final LeaveBalance? balance;
  final LeaveCalendar calendar;
  final String? problem;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final rule = leaveRules[type]!;
    final holidays = rule.calendarDays
        ? const <PublicHoliday>[]
        : calendar.holidaysBetween(start, end);
    final b = balance;
    // Only date problems belong here; the reason and approver are below.
    final dateProblem = problem == l.lvErrReason || problem == l.lvErrApprover
        ? null
        : problem;
    return SectionCard(
      color: dateProblem != null ? AbgColors.dangerSoft : AbgColors.surface,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                dateProblem != null
                    ? Icons.error_outline_rounded
                    : Icons.event_available_rounded,
                color: dateProblem != null
                    ? AbgColors.danger
                    : AbgColors.navy500,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                leaveDays(l, days),
                style: AbgText.h3.copyWith(
                  color: dateProblem != null
                      ? AbgColors.danger
                      : AbgColors.navy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            rule.calendarDays ? l.lvCountCalendar : l.lvCountNote,
            style: AbgText.caption,
          ),
          if (holidays.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              l.lvHolidaysIn(holidays.map((h) => h.name).join(', ')),
              style: AbgText.caption.copyWith(color: AbgColors.ink),
            ),
          ],
          if (dateProblem != null) ...[
            const SizedBox(height: 8),
            Text(
              dateProblem,
              style: AbgText.small.copyWith(
                color: AbgColors.danger,
                fontWeight: FontWeight.w600,
              ),
            ),
          ] else if (b != null &&
              b.entitled != null &&
              b.available != null) ...[
            const SizedBox(height: 8),
            Text(
              l.lvBalanceAfter(
                leaveNumber((b.available! - days).clamp(0, 999)),
                leaveNumber(b.entitled!),
              ),
              style: AbgText.small.copyWith(
                color: AbgColors.success,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
