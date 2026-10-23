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
import 'audit_api.dart';
import 'audit_models.dart';
import 'audit_widgets.dart';
import 'finding_form_screen.dart';

/// One audit: where it stands, the result, every finding with its owner and
/// due date, and — for the owner — "submit my fix"; for the audit lead and
/// compliance, start, record findings, verify, finish and close.
class AuditDetailScreen extends StatefulWidget {
  const AuditDetailScreen({super.key, required this.id, this.findingId});

  final String id;

  /// Opened from "My actions": this finding is shown first and outlined.
  final String? findingId;

  @override
  State<AuditDetailScreen> createState() => _AuditDetailScreenState();
}

enum _Act { start, addFinding, complete, close, cancel, note }

enum _FindingAct { submit, verify, reopen, reassign }

class _AuditDetailScreenState extends State<AuditDetailScreen> {
  late final AuditsApi _api = AuditsApi(context.read<ApiClient>());
  AuditDetail? _audit;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final audit = await _api.get(widget.id);
      if (mounted) setState(() => (_audit = audit, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _run(Future<AuditDetail> Function() call, String done) async {
    final l = L.of(context);
    setState(() => _busy = true);
    try {
      final next = await call();
      if (!mounted) return;
      setState(() => _audit = next);
      showSnack(context, done);
    } on ApiException catch (e) {
      if (!mounted) return;
      showSnack(context, e.isNetwork ? l.errorNetwork : e.message, error: true);
      if (e.isConflict) unawaited(_load());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _act(_Act act) async {
    final l = L.of(context);
    final a = _audit!;
    final key = const Uuid().v4();
    switch (act) {
      case _Act.start:
        final ok = await confirmDialog(
          context,
          title: l.audActStart,
          body: l.audStartHint,
          confirm: l.audActStart,
        );
        if (!ok || !mounted) return;
        await _run(
          () => _api.step(a.id, 'start', idempotencyKey: key),
          l.audDoneStarted,
        );
      case _Act.addFinding:
        final next = await Navigator.of(context).push<AuditDetail>(
          MaterialPageRoute(builder: (_) => FindingFormScreen(audit: a)),
        );
        if (next != null && mounted) setState(() => _audit = next);
      case _Act.complete:
        final input = await showAbgSheet<_FieldworkInput>(
          context,
          (_) => _FieldworkSheet(audit: a),
        );
        if (input == null || !mounted) return;
        await _run(
          () => _api.completeFieldwork(
            a.id,
            rating: input.rating,
            conclusion: input.conclusion,
            score: input.score,
            idempotencyKey: key,
          ),
          l.audDoneCompleted,
        );
      case _Act.close:
        final note = await askNote(
          context,
          title: l.audActClose,
          hint: l.audCloseHint,
          confirm: l.audActClose,
        );
        if (note == null || !mounted) return;
        await _run(
          () => _api.step(a.id, 'close', note: note, idempotencyKey: key),
          l.audDoneClosed,
        );
      case _Act.cancel:
        final note = await askNote(
          context,
          title: l.audActCancel,
          hint: l.audCancelHint,
          confirm: l.audActCancel,
          required: true,
          danger: true,
        );
        if (note == null || !mounted) return;
        await _run(
          () => _api.step(a.id, 'cancel', note: note, idempotencyKey: key),
          l.audDoneCancelled,
        );
      case _Act.note:
        final note = await askNote(
          context,
          title: l.kitAddNote,
          hint: l.kitAddNoteHint,
          confirm: l.kitAddNote,
          required: true,
          minLength: 2,
          label: l.kitNoteLabel,
        );
        if (note == null || !mounted) return;
        await _run(
          () => _api.step(a.id, 'notes', note: note, idempotencyKey: key),
          l.kitNoteAdded,
        );
    }
  }

  Future<void> _findingAct(AuditFinding f, _FindingAct act) async {
    final l = L.of(context);
    final key = const Uuid().v4();
    switch (act) {
      case _FindingAct.submit:
        final response = await askNote(
          context,
          title: l.audSubmitTitle,
          hint: '${f.number} · ${f.title}\n${l.audSubmitHint}',
          confirm: l.audActSubmit,
          required: true,
          maxLength: AuditLimits.findingDetailMax,
          label: l.audResponseLabel,
        );
        if (response == null || !mounted) return;
        await _run(
          () => _api.finding(f.id, 'submit', {
            'response': response,
          }, idempotencyKey: key),
          l.audDoneSubmitted,
        );
      case _FindingAct.verify:
        final note = await askNote(
          context,
          title: '${l.audActVerify} ${f.number}',
          hint: l.audVerifyHint,
          confirm: l.audActVerify,
        );
        if (note == null || !mounted) return;
        await _run(
          () => _api.finding(f.id, 'verify', {
            if (note.isNotEmpty) 'note': note,
          }, idempotencyKey: key),
          l.audDoneVerified,
        );
      case _FindingAct.reopen:
        final note = await askNote(
          context,
          title: '${l.audActReopen} · ${f.number}',
          hint: l.audReopenHint,
          confirm: l.audActReopen,
          required: true,
          danger: true,
        );
        if (note == null || !mounted) return;
        await _run(
          () =>
              _api.finding(f.id, 'reopen', {'note': note}, idempotencyKey: key),
          l.audDoneReopened,
        );
      case _FindingAct.reassign:
        final owner = await pickPerson(
          context,
          title: l.audChooseOwner,
          hint: l.audOwnerHint,
        );
        if (owner?.userId == null || !mounted) return;
        await _run(
          () => _api.finding(f.id, 'reassign', {
            'ownerUserId': owner!.userId,
          }, idempotencyKey: key),
          l.audDoneReassigned,
        );
    }
  }

  List<ActionSpec> _actions(L l, AuditDetail a) => [
    if (a.can('ADD_FINDING'))
      ActionSpec(
        l.audActAddFinding,
        Icons.playlist_add_rounded,
        () => _act(_Act.addFinding),
      ),
    if (a.can('CANCEL'))
      ActionSpec(
        l.audActCancel,
        Icons.block_rounded,
        () => _act(_Act.cancel),
        danger: true,
      ),
    if (a.can('START'))
      ActionSpec(
        l.audActStart,
        Icons.play_arrow_rounded,
        () => _act(_Act.start),
        primary: true,
      ),
    if (a.can('COMPLETE_FIELDWORK'))
      ActionSpec(
        l.audActComplete,
        Icons.flag_outlined,
        () => _act(_Act.complete),
        primary: true,
      ),
    if (a.can('CLOSE'))
      ActionSpec(
        l.audActClose,
        Icons.verified_outlined,
        () => _act(_Act.close),
        primary: true,
      ),
  ];

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = _audit;
    final findings = a == null
        ? const <AuditFinding>[]
        : ([...a.findings]..sort((x, y) {
            if (x.id == widget.findingId) return -1;
            if (y.id == widget.findingId) return 1;
            return 0;
          }));
    return Scaffold(
      appBar: AppBar(
        title: Text(a?.row.referenceNumber ?? l.audTitle),
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
                  _Hero(audit: a),
                  if (a.partial) ...[
                    const SizedBox(height: 14),
                    ToneBanner(
                      icon: Icons.visibility_outlined,
                      tone: Tone.active,
                      body: l.audPartial,
                    ),
                  ],
                  if (!a.partial) ...[
                    const SizedBox(height: 16),
                    ProgressSteps(title: l.kitProgress, steps: _steps(l, a)),
                  ],
                  if (a.row.rating != null) ...[
                    const SizedBox(height: 16),
                    _ResultCard(audit: a),
                  ],
                  if (a.status == 'CANCELLED' &&
                      a.statusNote != null &&
                      a.statusNote!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    QuoteCard(label: l.kitLatestNote, text: a.statusNote!),
                  ],
                  if (!a.partial && a.row.counts.total > 0) ...[
                    const SizedBox(height: 16),
                    _Counts(counts: a.row.counts),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.audFindings),
                  if (findings.isEmpty)
                    SectionCard(
                      child: Text(l.audNoFindings, style: AbgText.small),
                    )
                  else
                    for (final f in findings)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _FindingCard(
                          finding: f,
                          highlighted: f.id == widget.findingId,
                          busy: _busy,
                          onAct: (act) => _findingAct(f, act),
                        ),
                      ),
                  const SizedBox(height: 12),
                  SectionTitle(l.audTitle),
                  _InfoCard(audit: a),
                  if (a.updates.isNotEmpty) ...[
                    const SizedBox(height: 22),
                    SectionTitle(l.kitHistory),
                    HistoryCard(
                      entries: [for (final e in a.updates) _entry(l, a, e)],
                    ),
                  ],
                ],
              ),
            ),
      bottomNavigationBar: a == null
          ? null
          : BottomActions(busy: _busy, actions: _actions(l, a)),
    );
  }

  List<StepItem> _steps(L l, AuditDetail a) {
    final s = a.status;
    String when(DateTime? t) => t == null ? '' : dayAndTime(t, l.localeName);
    final c = a.row.counts;
    // Closed straight after fieldwork: nothing needed fixing.
    final noActions = s == 'CLOSED' && c.open + c.submitted + c.verified == 0;
    final fieldwork = switch (s) {
      'PLANNED' => 'upcoming',
      'IN_PROGRESS' => 'current',
      'CANCELLED' => 'cancelled',
      _ => 'done',
    };
    final actions = switch (s) {
      'FOLLOW_UP' => 'current',
      'CLOSED' => noActions ? 'skipped' : 'done',
      'CANCELLED' => 'skipped',
      _ => 'upcoming',
    };
    final closed = switch (s) {
      'CLOSED' => 'done',
      'CANCELLED' => 'skipped',
      _ => 'upcoming',
    };
    return [
      StepItem(
        label: l.audStageStart,
        state: 'done',
        icon: Icons.event_note_outlined,
        caption: [
          a.createdByName,
          when(a.createdAt),
        ].whereType<String>().where((x) => x.isNotEmpty).join(' · '),
      ),
      StepItem(
        label: l.audStageFieldwork,
        state: fieldwork,
        icon: Icons.manage_search_rounded,
        caption: switch (fieldwork) {
          'done' => when(a.fieldworkCompletedAt ?? a.startedAt),
          'cancelled' => l.audStatusCANCELLED,
          _ => tourDateRange(
            a.row.plannedStart,
            a.row.plannedEnd,
            l.localeName,
          ),
        },
      ),
      StepItem(
        label: l.audStageActions,
        state: actions,
        icon: Icons.build_circle_outlined,
        caption: switch (actions) {
          'skipped' => noActions ? l.lvStageSkipped : '',
          'current' || 'done' => l.audActionsLeft(c.stillOpen),
          _ => '',
        },
      ),
      StepItem(
        label: l.audStageClosed,
        state: closed,
        icon: Icons.verified_outlined,
        caption: closed == 'done' ? when(a.closedAt) : '',
      ),
    ];
  }

  HistoryEntry _entry(L l, AuditDetail a, AuditEvent e) {
    final finding = e.findingId == null
        ? null
        : a.findings.where((f) => f.id == e.findingId).firstOrNull;
    String withNumber(String s) =>
        finding == null ? s : '$s · ${finding.number}';
    final (String title, IconData icon, Color color) = switch (e.type) {
      'CREATED' => (
        l.audEvCreated,
        Icons.event_note_outlined,
        AbgColors.navy500,
      ),
      'FINDING_ADDED' => (
        withNumber(l.audEvFinding),
        Icons.playlist_add_rounded,
        AbgColors.pending,
      ),
      'FINDING_SUBMITTED' => (
        withNumber(l.audEvSubmitted),
        Icons.outbox_outlined,
        AbgColors.active,
      ),
      'FINDING_VERIFIED' => (
        withNumber(l.audEvVerified),
        Icons.verified_outlined,
        AbgColors.success,
      ),
      'FINDING_REOPENED' => (
        withNumber(l.audEvReopened),
        Icons.undo_rounded,
        AbgColors.danger,
      ),
      'FINDING_REASSIGNED' => (
        withNumber(l.audEvReassigned),
        Icons.swap_horiz_rounded,
        AbgColors.navy500,
      ),
      'NOTE_ADDED' => (
        l.audEvNote,
        Icons.chat_bubble_outline_rounded,
        AbgColors.navy500,
      ),
      _ => switch (e.toStatus) {
        'IN_PROGRESS' => (
          l.audEvStarted,
          Icons.play_arrow_rounded,
          AbgColors.active,
        ),
        'FOLLOW_UP' => (
          l.audEvCompleted,
          Icons.flag_outlined,
          AbgColors.pending,
        ),
        'CLOSED' => (
          e.fromStatus == 'IN_PROGRESS' ? l.audEvCompleted : l.audEvClosed,
          Icons.verified_outlined,
          AbgColors.success,
        ),
        'CANCELLED' => (
          l.audEvCancelled,
          Icons.block_rounded,
          AbgColors.neutral,
        ),
        _ => (
          auditStatusLabel(l, e.toStatus ?? ''),
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
  const _Hero({required this.audit});
  final AuditDetail audit;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = audit.row;
    return ModuleHero(
      chips: [
        ToneBadge(
          label: auditTypeLabel(l, r.type),
          tone: Tone.neutral,
          icon: auditTypeIcon(r.type),
          dense: true,
          onDark: true,
        ),
        AuditStatusChip(r.status, dense: true, onDark: true),
      ],
      title: r.title,
      lines: [
        (Icons.apartment_rounded, r.branchName),
        (
          Icons.event_outlined,
          tourDateRange(r.plannedStart, r.plannedEnd, l.localeName),
        ),
        (Icons.person_outline_rounded, '${l.audLead}: ${r.leadName}'),
        if (r.externalBody != null && r.externalBody!.isNotEmpty)
          (Icons.business_rounded, r.externalBody!),
      ],
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.audit});
  final AuditDetail audit;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = audit.row;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(l.audResult, style: AbgText.h3),
              const Spacer(),
              ToneBadge(
                label: auditRatingLabel(l, r.rating!),
                tone: auditRatingTone(r.rating!),
                icon: Icons.grading_rounded,
              ),
            ],
          ),
          if (r.score != null) ...[
            const SizedBox(height: 10),
            Text(l.audScore('${r.score}'), style: AbgText.bodyStrong),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: r.score! / 100,
                minHeight: 8,
                backgroundColor: AbgColors.softSilver,
                color: toneColors(auditRatingTone(r.rating!)).fg,
              ),
            ),
          ],
          if (audit.conclusion != null && audit.conclusion!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(l.audConclusion, style: AbgText.caption),
            const SizedBox(height: 2),
            Text(audit.conclusion!, style: AbgText.body),
          ],
        ],
      ),
    );
  }
}

class _Counts extends StatelessWidget {
  const _Counts({required this.counts});
  final FindingCounts counts;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    Widget cell(String label, int value, Color color) => Expanded(
      child: Column(
        children: [
          Text(
            '$value',
            style: AbgText.h2.copyWith(
              color: value == 0 ? AbgColors.inkSubtle : color,
            ),
          ),
          Text(label, style: AbgText.caption),
        ],
      ),
    );
    return SectionCard(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      child: Row(
        children: [
          cell(l.audCountOpen, counts.open, AbgColors.pending),
          cell(l.audCountSubmitted, counts.submitted, AbgColors.active),
          cell(l.audCountVerified, counts.verified, AbgColors.success),
          cell(l.audCountOverdue, counts.overdue, AbgColors.danger),
        ],
      ),
    );
  }
}

class _FindingCard extends StatelessWidget {
  const _FindingCard({
    required this.finding,
    required this.highlighted,
    required this.busy,
    required this.onAct,
  });

  final AuditFinding finding;
  final bool highlighted;
  final bool busy;
  final ValueChanged<_FindingAct> onAct;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final f = finding;
    Widget field(String label, String? value) => value == null || value.isEmpty
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AbgText.caption),
                Text(
                  value,
                  style: AbgText.small.copyWith(color: AbgColors.ink),
                ),
              ],
            ),
          );
    final buttons = <Widget>[
      if (f.can('REASSIGN'))
        TextButton.icon(
          onPressed: busy ? null : () => onAct(_FindingAct.reassign),
          icon: const Icon(Icons.swap_horiz_rounded, size: 18),
          label: Text(l.audActReassign),
        ),
      if (f.can('REOPEN'))
        OutlinedButton.icon(
          onPressed: busy ? null : () => onAct(_FindingAct.reopen),
          style: OutlinedButton.styleFrom(foregroundColor: AbgColors.danger),
          icon: const Icon(Icons.undo_rounded, size: 18),
          label: Text(l.audActReopen),
        ),
      if (f.can('VERIFY'))
        FilledButton.icon(
          onPressed: busy ? null : () => onAct(_FindingAct.verify),
          icon: const Icon(Icons.verified_outlined, size: 18),
          label: Text(l.audActVerify),
        ),
      if (f.can('SUBMIT'))
        FilledButton.icon(
          onPressed: busy ? null : () => onAct(_FindingAct.submit),
          icon: const Icon(Icons.outbox_outlined, size: 18),
          label: Text(l.audActSubmit),
        ),
    ];
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AbgRadii.lg + 2),
        border: highlighted
            ? Border.all(color: AbgColors.pending, width: 2)
            : null,
      ),
      child: SectionCard(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SeverityTag(f.severity),
                const SizedBox(width: 8),
                Text(
                  f.number,
                  style: AbgText.mono.copyWith(
                    fontSize: 12,
                    color: AbgColors.inkMuted,
                  ),
                ),
                const Spacer(),
                ToneBadge(
                  label: findingStatusLabel(l, f.status),
                  tone: findingStatusTone(f.status),
                  icon: findingStatusIcon(f.status),
                  dense: true,
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(f.title, style: AbgText.bodyStrong.copyWith(fontSize: 15)),
            field(l.audDetail, f.detail),
            field(l.audClause, f.clause),
            field(l.audArea, f.area),
            field(l.audRecommendation, f.recommendation),
            if (f.owner != null || f.dueDate != null) ...[
              const Divider(height: 22),
              Row(
                children: [
                  const Icon(
                    Icons.person_outline_rounded,
                    size: 16,
                    color: AbgColors.inkSubtle,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      f.owner == null
                          ? l.audNoOwner
                          : [
                              f.owner!.name,
                              f.owner!.subtitle,
                            ].where((s) => s.isNotEmpty).join(' · '),
                      style: AbgText.small.copyWith(color: AbgColors.ink),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              DueLine(finding: f),
            ],
            if (f.response != null && f.response!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AbgColors.activeSoft,
                  borderRadius: BorderRadius.circular(AbgRadii.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.audResponse,
                      style: AbgText.caption.copyWith(color: AbgColors.active),
                    ),
                    Text(
                      f.response!,
                      style: AbgText.small.copyWith(color: AbgColors.ink),
                    ),
                  ],
                ),
              ),
            ],
            if (f.verifiedByName != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.verified_outlined,
                    size: 15,
                    color: AbgColors.success,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    [
                      l.audVerifiedBy(f.verifiedByName!),
                      if (f.verifiedAt != null)
                        dayAndTime(f.verifiedAt!, l.localeName),
                    ].join(' · '),
                    style: AbgText.caption.copyWith(color: AbgColors.success),
                  ),
                ],
              ),
            ],
            if (buttons.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                alignment: WrapAlignment.end,
                spacing: 8,
                runSpacing: 8,
                children: buttons,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.audit});
  final AuditDetail audit;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = audit;
    final r = a.row;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InfoRow(
            icon: auditTypeIcon(r.type),
            label: l.lvTypeLabel,
            value: auditTypeLabel(l, r.type),
          ),
          InfoRow(
            icon: Icons.apartment_rounded,
            label: l.kitOffice,
            value: r.branchName,
          ),
          InfoRow(
            icon: Icons.event_outlined,
            label: l.audFieldwork,
            value: tourDateRange(r.plannedStart, r.plannedEnd, l.localeName),
          ),
          InfoRow(
            icon: Icons.person_outline_rounded,
            label: l.audLead,
            value: [
              r.leadName,
              a.leadDesignation,
            ].whereType<String>().join(' · '),
          ),
          if (r.externalBody != null && r.externalBody!.isNotEmpty)
            InfoRow(
              icon: Icons.business_rounded,
              label: l.audBody,
              value: r.externalBody!,
            ),
          if (a.team.isNotEmpty)
            InfoRow(
              icon: Icons.groups_outlined,
              label: l.audTeam,
              value: a.team.join(', '),
            ),
          if (a.scope != null && a.scope!.isNotEmpty) ...[
            const Divider(height: 24),
            Text(l.audScope, style: AbgText.caption),
            const SizedBox(height: 2),
            Text(
              a.scope!,
              style: AbgText.body.copyWith(color: AbgColors.inkMuted),
            ),
          ],
        ],
      ),
    );
  }
}

class _FieldworkInput {
  const _FieldworkInput(this.rating, this.conclusion, this.score);
  final String rating;
  final String conclusion;
  final int? score;
}

/// The overall result, a score and the conclusion.
class _FieldworkSheet extends StatefulWidget {
  const _FieldworkSheet({required this.audit});
  final AuditDetail audit;

  @override
  State<_FieldworkSheet> createState() => _FieldworkSheetState();
}

class _FieldworkSheetState extends State<_FieldworkSheet> {
  late String _rating = widget.audit.row.counts.criticalOpen > 0
      ? 'UNSATISFACTORY'
      : widget.audit.row.counts.stillOpen > 0
      ? 'NEEDS_IMPROVEMENT'
      : 'SATISFACTORY';
  final _score = TextEditingController();
  final _conclusion = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _score.dispose();
    _conclusion.dispose();
    super.dispose();
  }

  void _done() {
    final l = L.of(context);
    final conclusion = _conclusion.text.trim();
    if (conclusion.length < 3) {
      setState(() => _error = l.audErrConclusion);
      return;
    }
    final score = int.tryParse(_score.text.trim());
    Navigator.pop(
      context,
      _FieldworkInput(_rating, conclusion, score?.clamp(0, 100)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SheetHeader(title: l.audCompleteTitle, hint: l.audCompleteHint),
            IconChoiceChips<String>(
              values: auditRatings,
              selected: _rating,
              label: (r) => auditRatingLabel(l, r),
              icon: (r) => switch (r) {
                'SATISFACTORY' => Icons.thumb_up_alt_outlined,
                'NEEDS_IMPROVEMENT' => Icons.trending_up_rounded,
                _ => Icons.thumb_down_alt_outlined,
              },
              onSelected: (r) => setState(() => _rating = r),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _score,
              keyboardType: TextInputType.number,
              maxLength: 3,
              decoration: InputDecoration(
                labelText: l.audScoreLabel,
                counterText: '',
                prefixIcon: const Icon(Icons.speed_rounded),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _conclusion,
              minLines: 3,
              maxLines: 6,
              maxLength: AuditLimits.findingDetailMax,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) {
                if (_error != null) setState(() => _error = null);
              },
              decoration: InputDecoration(
                labelText: '${l.audConclusionLabel} *',
                errorText: _error,
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: _done,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
              child: Text(l.audActComplete),
            ),
          ],
        ),
      ),
    );
  }
}
