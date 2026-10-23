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
import 'leave_api.dart';
import 'leave_models.dart';
import 'leave_widgets.dart';

/// One application: where it is in Applied → HOD → HR → Approved, the days,
/// the people, the balance, the history and the buttons this person may use.
class LeaveDetailScreen extends StatefulWidget {
  const LeaveDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<LeaveDetailScreen> createState() => _LeaveDetailScreenState();
}

enum _Act { approve, reject, cancel, note }

class _LeaveDetailScreenState extends State<LeaveDetailScreen> {
  late final LeaveApi _api = LeaveApi(context.read<ApiClient>());
  LeaveDetail? _leave;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final leave = await _api.get(widget.id);
      if (mounted) setState(() => (_leave = leave, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _act(_Act act) async {
    final l = L.of(context);
    final v = _leave!;
    final hodStage = v.row.awaiting == 'HOD';
    final note = await switch (act) {
      _Act.approve => askNote(
        context,
        title: hodStage ? l.lvApproveHodTitle : l.lvActApprove,
        hint: hodStage ? l.lvApproveHodHint : l.lvApproveHrHint,
        confirm: hodStage ? l.lvActApproveHod : l.lvActApprove,
      ),
      _Act.reject => askNote(
        context,
        title: l.lvActReject,
        hint: l.lvRejectHint,
        confirm: l.lvActReject,
        required: true,
        danger: true,
      ),
      _Act.cancel => askNote(
        context,
        title: l.lvActCancel,
        hint: v.isApplicant ? l.lvCancelHint : l.lvCancelHrHint,
        confirm: l.lvActCancel,
        required: true,
        danger: true,
      ),
      _Act.note => askNote(
        context,
        title: l.kitAddNote,
        hint: l.kitAddNoteHint,
        confirm: l.kitAddNote,
        required: true,
        minLength: 2,
        label: l.kitNoteLabel,
      ),
    };
    if (note == null || !mounted) return;
    setState(() => _busy = true);
    final key = const Uuid().v4();
    try {
      final next = switch (act) {
        _Act.approve => await _api.decide(
          v.id,
          approve: true,
          note: note,
          idempotencyKey: key,
        ),
        _Act.reject => await _api.decide(
          v.id,
          approve: false,
          note: note,
          idempotencyKey: key,
        ),
        _Act.cancel => await _api.step(
          v.id,
          'cancel',
          note: note,
          idempotencyKey: key,
        ),
        _Act.note => await _api.step(
          v.id,
          'notes',
          note: note,
          idempotencyKey: key,
        ),
      };
      if (!mounted) return;
      setState(() => _leave = next);
      showSnack(context, switch (act) {
        _Act.approve =>
          next.status == 'APPROVED' ? l.lvDoneApproved : l.lvDoneForwarded,
        _Act.reject => l.lvDoneRejected,
        _Act.cancel => l.lvDoneCancelled,
        _Act.note => l.kitNoteAdded,
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
    final v = _leave;
    return Scaffold(
      appBar: AppBar(
        title: Text(v?.row.referenceNumber ?? l.lvTitle),
        actions: [
          if (v != null && v.can('ADD_NOTE'))
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
          : v == null
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
                  _Hero(leave: v),
                  if (v.row.onLeaveNow) ...[
                    const SizedBox(height: 14),
                    ToneBanner(
                      icon: Icons.beach_access_rounded,
                      tone: Tone.active,
                      body: v.isApplicant
                          ? l.lvOnLeaveBanner(v.row.referenceNumber)
                          : l.lvOnLeaveNow,
                    ),
                  ],
                  if (v.blockedReason == 'SEPARATION_OF_DUTIES') ...[
                    const SizedBox(height: 14),
                    ToneBanner(
                      icon: Icons.info_outline_rounded,
                      tone: Tone.active,
                      body: l.lvSeparation,
                    ),
                  ],
                  if (v.isReliever && !v.isApplicant) ...[
                    const SizedBox(height: 14),
                    ToneBanner(
                      icon: Icons.handshake_outlined,
                      tone: Tone.active,
                      body: l.lvRelieverBanner(v.applicant.name),
                    ),
                  ],
                  const SizedBox(height: 16),
                  ProgressSteps(
                    title: l.lvPipeline,
                    steps: [
                      for (final s in v.pipeline)
                        StepItem(
                          label: leaveStageLabel(l, s.key),
                          state: s.state,
                          icon: leaveStageIcon(s.key),
                          caption: _caption(l, s),
                        ),
                    ],
                  ),
                  if (v.row.statusNote != null &&
                      v.row.statusNote!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    QuoteCard(label: l.kitLatestNote, text: v.row.statusNote!),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.lvDetails),
                  _DetailsCard(leave: v),
                  const SizedBox(height: 22),
                  SectionTitle(l.lvPeople),
                  _PeopleCard(leave: v),
                  if (v.balance != null) ...[
                    const SizedBox(height: 22),
                    SectionTitle(
                      l.lvBalanceCard(
                        leaveTypeLabel(l, v.row.type),
                        '${v.row.startDate.year}',
                      ),
                    ),
                    _BalanceCard(balance: v.balance!),
                  ],
                  if (v.updates.isNotEmpty) ...[
                    const SizedBox(height: 22),
                    SectionTitle(l.kitHistory),
                    HistoryCard(
                      entries: [for (final e in v.updates) _entry(l, e)],
                    ),
                  ],
                ],
              ),
            ),
      bottomNavigationBar: v == null
          ? null
          : BottomActions(
              busy: _busy,
              actions: [
                if (v.can('APPROVE')) ...[
                  ActionSpec(
                    l.lvActReject,
                    Icons.close_rounded,
                    () => _act(_Act.reject),
                    danger: true,
                  ),
                  ActionSpec(
                    v.row.awaiting == 'HOD'
                        ? l.lvActApproveHod
                        : l.lvActApprove,
                    Icons.check_rounded,
                    () => _act(_Act.approve),
                    primary: true,
                  ),
                ] else if (v.can('CANCEL'))
                  ActionSpec(
                    l.lvActCancel,
                    Icons.block_rounded,
                    () => _act(_Act.cancel),
                    danger: true,
                  ),
              ],
            ),
    );
  }

  String _caption(L l, LeaveStage s) => switch (s.state) {
    'done' => [
      s.by,
      if (s.at != null) dayAndTime(s.at!, l.localeName),
    ].whereType<String>().join(' · '),
    'current' =>
      s.waitingFor != null
          ? l.lvWaitingFor(
              s.key == 'PENDING_HR' ? l.lvStagePENDING_HR : s.waitingFor!,
            )
          : '',
    'rejected' => l.lvStageRejectedBy(s.by ?? '—'),
    'cancelled' => l.lvStageCancelledBy(s.by ?? '—'),
    'skipped' => l.lvStageSkipped,
    _ => s.waitingFor ?? '',
  };

  HistoryEntry _entry(L l, LeaveEvent e) {
    final (String title, IconData icon, Color color) = switch (e.type) {
      'SUBMITTED' => (l.lvEvSubmitted, Icons.send_rounded, AbgColors.navy500),
      'NOTE_ADDED' => (
        l.lvEvNote,
        Icons.chat_bubble_outline_rounded,
        AbgColors.navy500,
      ),
      _ => switch (e.toStatus) {
        'PENDING_HR' => (
          l.lvEvHod,
          Icons.how_to_reg_outlined,
          AbgColors.success,
        ),
        'APPROVED' => (
          l.lvEvApproved,
          Icons.verified_outlined,
          AbgColors.success,
        ),
        'REJECTED' => (l.lvEvRejected, Icons.cancel_outlined, AbgColors.danger),
        'CANCELLED' => (
          l.lvEvCancelled,
          Icons.block_rounded,
          AbgColors.neutral,
        ),
        _ => (
          leaveStatusLabel(l, e.toStatus ?? ''),
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
  const _Hero({required this.leave});
  final LeaveDetail leave;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = leave.row;
    return ModuleHero(
      chips: [LeaveStatusChip(r.status, dense: true, onDark: true)],
      title: '${leaveTypeLabel(l, r.type)} · ${leaveDays(l, r.days)}',
      lines: [
        (Icons.event_outlined, leaveWhen(l, r.startDate, r.endDate, r.halfDay)),
        (Icons.person_outline_rounded, leave.applicant.name),
        if (leave.reliever != null)
          (
            Icons.handshake_outlined,
            '${l.lvCovering}: ${leave.reliever!.name}',
          ),
      ],
    );
  }
}

class _DetailsCard extends StatelessWidget {
  const _DetailsCard({required this.leave});
  final LeaveDetail leave;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final v = leave;
    final r = v.row;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InfoRow(
            icon: leaveTypeIcon(r.type),
            label: l.lvTypeLabel,
            value: leaveTypeLabel(l, r.type),
          ),
          InfoRow(
            icon: Icons.event_outlined,
            label: l.lvFirstDay,
            value: tourDay(r.startDate, l.localeName),
          ),
          if (r.endDate != r.startDate)
            InfoRow(
              icon: Icons.event_available_outlined,
              label: l.lvLastDay,
              value: tourDay(r.endDate, l.localeName),
            ),
          if (r.halfDay != null)
            InfoRow(
              icon: Icons.wb_twilight_rounded,
              label: l.lvHalfDay,
              value: halfDayLabel(l, r.halfDay!),
            ),
          InfoRow(
            icon: Icons.timelapse_rounded,
            label: l.lvLength,
            value: leaveDays(l, r.days),
          ),
          if (v.branchName.isNotEmpty)
            InfoRow(
              icon: Icons.apartment_rounded,
              label: l.kitOffice,
              value: v.branchName,
            ),
          if (r.reason != null && r.reason!.isNotEmpty)
            InfoRow(
              icon: Icons.notes_rounded,
              label: l.lvReasonTitle,
              value: r.reason!,
              valueStyle: AbgText.body.copyWith(fontSize: 14),
            ),
          if (v.addressDuringLeave != null)
            InfoRow(
              icon: Icons.home_outlined,
              label: l.lvAddressTitle,
              value: v.addressDuringLeave!,
            ),
          if (v.contactPhone != null)
            InfoRow(
              icon: Icons.call_outlined,
              label: l.lvPhoneTitle,
              value: v.contactPhone!,
            ),
        ],
      ),
    );
  }
}

class _PeopleCard extends StatelessWidget {
  const _PeopleCard({required this.leave});
  final LeaveDetail leave;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    String describe(LeavePerson p) =>
        [p.name, p.subtitle].where((s) => s.isNotEmpty).join(' · ');
    return SectionCard(
      child: Column(
        children: [
          InfoRow(
            icon: Icons.person_outline_rounded,
            label: l.lvApplicant,
            value: describe(leave.applicant),
          ),
          InfoRow(
            icon: Icons.how_to_reg_outlined,
            label: l.lvHod,
            value: describe(leave.approver),
          ),
          if (leave.reliever != null)
            InfoRow(
              icon: Icons.handshake_outlined,
              label: l.lvCovering,
              value: describe(leave.reliever!),
            ),
        ],
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.balance});
  final LeaveBalance balance;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final b = balance;
    Widget cell(String label, String value, {Color? color}) => Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: AbgText.h2.copyWith(color: color ?? AbgColors.navy),
          ),
          const SizedBox(height: 2),
          Text(label, style: AbgText.caption),
        ],
      ),
    );
    return SectionCard(
      child: Row(
        children: [
          cell(
            l.lvEntitled,
            b.entitled == null ? '—' : leaveNumber(b.entitled!),
          ),
          cell(l.lvUsed, leaveNumber(b.used)),
          cell(
            l.lvPendingLabel,
            leaveNumber(b.pending),
            color: b.pending > 0 ? AbgColors.pending : null,
          ),
          cell(
            l.lvAvailable,
            b.available == null ? '—' : leaveNumber(b.available!),
            color: AbgColors.success,
          ),
        ],
      ),
    );
  }
}
