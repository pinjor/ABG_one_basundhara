/// Everything waiting for my approval: official tours (as head of department,
/// HR & Finance or MD / Chairman), pool car requests and leave applications
/// (as head of department or HR) and meeting requests to answer (as the
/// person asked or the executive office), with approve and reject right here.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import '../appointments/appointments.dart' show meetingWhen;
import '../leave/leave.dart' show leaveDays, leaveTypeLabel, leaveWhen;
import '../tours/tour_models.dart' show calendarDate;

/// One request waiting for the signed-in person.
class ApprovalItem {
  ApprovalItem({
    required this.kind,
    required this.id,
    required this.reference,
    required this.title,
    required this.awaiting,
    required this.requester,
    required this.createdAt,
    this.requesterRole,
    this.foreign = false,
    this.urgent = false,
    this.destination,
    this.start,
    this.end,
    this.budget,
    this.passengers,
    this.leaveType,
    this.days,
    this.halfDay,
    this.minutes,
    this.host,
  });

  /// "tour", "car", "leave" or "meeting".
  final String kind;
  final String id;
  final String reference;
  final String title;

  /// HOD, VETTING, SANCTION, HR or (a meeting) ANSWER.
  final String awaiting;
  final String requester;
  final String? requesterRole;
  final DateTime createdAt;
  final bool foreign;
  final bool urgent;
  final String? destination;
  final DateTime? start;
  final DateTime? end;
  final int? budget;
  final int? passengers;
  final String? leaveType;
  final double? days;
  final String? halfDay;
  final int? minutes;

  /// A meeting: who was asked (the executive office answers for the MD).
  final String? host;

  String get route => switch (kind) {
    'tour' => '/tours/$id',
    'leave' => '/leave/$id',
    'meeting' => '/appointments/$id',
    _ => '/pool-car/$id',
  };

  static String? _s(Object? v) => v?.toString();
  static DateTime? _d(Object? v) =>
      v == null ? null : DateTime.tryParse(v.toString());

  static String _who(Map j, String key) {
    final p = j[key];
    return p is Map ? (_s(p['name']) ?? '') : '';
  }

  static String? _role(Map j, String key) {
    final p = j[key];
    if (p is! Map) return null;
    final parts = [
      _s(p['designation']),
      _s(p['department']),
    ].whereType<String>();
    return parts.isEmpty ? null : parts.join(' · ');
  }

  factory ApprovalItem.tour(Map j) => ApprovalItem(
    kind: 'tour',
    id: j['id'].toString(),
    reference: _s(j['referenceNumber']) ?? '',
    title: _s(j['title']) ?? '',
    awaiting: _s(j['awaiting']) ?? 'HOD',
    requester: _who(j, 'traveller'),
    requesterRole: _role(j, 'traveller'),
    createdAt: _d(j['createdAt']) ?? DateTime.now(),
    foreign: j['type'] == 'FOREIGN',
    destination: _s(j['destination']),
    start: _d(j['startDate']),
    end: _d(j['endDate']),
    budget: (j['estimatedBudget'] as num?)?.toInt(),
  );

  factory ApprovalItem.car(Map j) => ApprovalItem(
    kind: 'car',
    id: j['id'].toString(),
    reference: _s(j['referenceNumber']) ?? '',
    title: _s(j['title']) ?? _s(j['purpose']) ?? '',
    awaiting: _s(j['awaiting']) ?? 'HOD',
    requester: _who(j, 'requester'),
    requesterRole: _role(j, 'requester'),
    createdAt: _d(j['createdAt']) ?? DateTime.now(),
    urgent: j['urgent'] == true,
    destination: [
      _s(j['pickupLocation']),
      _s(j['dropLocation']),
    ].whereType<String>().join(' → '),
    start: _d(j['pickupAt']),
    passengers: (j['passengerCount'] as num?)?.toInt(),
  );

  factory ApprovalItem.leave(Map j) => ApprovalItem(
    kind: 'leave',
    id: j['id'].toString(),
    reference: _s(j['referenceNumber']) ?? '',
    title: _s(j['reason']) ?? '',
    awaiting: _s(j['awaiting']) ?? 'HOD',
    requester: _who(j, 'applicant'),
    requesterRole: _role(j, 'applicant'),
    createdAt: _d(j['createdAt']) ?? DateTime.now(),
    start: calendarDate(j['startDate']),
    end: calendarDate(j['endDate']),
    leaveType: _s(j['type']),
    days: (j['days'] as num?)?.toDouble(),
    halfDay: _s(j['halfDay']),
  );

  factory ApprovalItem.meeting(Map j) => ApprovalItem(
    kind: 'meeting',
    id: j['id'].toString(),
    reference: _s(j['referenceNumber']) ?? '',
    title: _s(j['subject']) ?? '',
    awaiting: 'ANSWER',
    requester: _who(j, 'requester'),
    requesterRole: _role(j, 'requester'),
    createdAt: _d(j['createdAt']) ?? DateTime.now(),
    urgent: j['urgent'] == true,
    start: _d(j['preferredAt']),
    minutes: (j['durationMinutes'] as num?)?.toInt(),
    host: _who(j, 'host'),
  );
}

class ApprovalsScreen extends StatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen> {
  List<ApprovalItem> _items = [];
  bool _loading = true;
  Object? _error;
  String _filter = 'all';
  final _busy = <String>{};

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    final api = context.read<ApiClient>();
    Future<List<ApprovalItem>> fetch(
      String path,
      ApprovalItem Function(Map) make,
    ) async {
      try {
        final body = await api.get(path);
        final items = body is Map ? body['items'] : body;
        return [
          for (final j in (items as List? ?? const []))
            if (j is Map) make(j),
        ];
      } on ApiException catch (e) {
        // A module that is switched off for this person simply has nothing.
        if (e.status == 403 || e.status == 404) return [];
        rethrow;
      }
    }

    try {
      final results = await Future.wait([
        fetch('/tours/approvals', ApprovalItem.tour),
        fetch('/pool-car/approvals', ApprovalItem.car),
        fetch('/leave/approvals', ApprovalItem.leave),
        fetch('/appointments/inbox', ApprovalItem.meeting),
      ]);
      final all = [for (final r in results) ...r]
        ..sort((a, b) {
          if (a.urgent != b.urgent) return a.urgent ? -1 : 1;
          return a.createdAt.compareTo(b.createdAt);
        });
      if (!mounted) return;
      setState(() {
        _items = all;
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

  Future<void> _decide(ApprovalItem item, bool approve) async {
    final l = L.of(context);
    final note = await _askNote(
      context,
      approve: approve,
      meeting: item.kind == 'meeting',
    );
    if (note == null || !mounted) return;
    setState(() => _busy.add(item.id));
    final api = context.read<ApiClient>();
    try {
      final body = {if (note.isNotEmpty) 'note': note};
      switch (item.kind) {
        // A meeting is confirmed at the time asked for, or declined.
        case 'meeting':
          await api.post(
            '/appointments/${item.id}/${approve ? 'confirm' : 'decline'}',
            body: body,
          );
        default:
          await api.post(
            switch (item.kind) {
              'tour' => '/tours/${item.id}/decision',
              'leave' => '/leave/${item.id}/decision',
              _ => '/pool-car/requisitions/${item.id}/decision',
            },
            body: {'decision': approve ? 'APPROVE' : 'REJECT', ...body},
          );
      }
      if (!mounted) return;
      showSnack(
        context,
        item.kind == 'meeting'
            ? (approve ? l.apprMeetingConfirmed : l.apprMeetingDeclined)
            : (approve ? l.apprApproved : l.apprRejected),
      );
      setState(
        () => _items.removeWhere((i) => i.kind == item.kind && i.id == item.id),
      );
    } catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    } finally {
      if (mounted) setState(() => _busy.remove(item.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final shown = _items
        .where((i) => _filter == 'all' || i.kind == _filter)
        .toList();
    int n(String kind) => _items.where((i) => i.kind == kind).length;
    return Scaffold(
      appBar: AppBar(title: Text(l.apprTitle)),
      body: RefreshIndicator(
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
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final (value, label, count) in [
                  ('all', l.apprAll, _items.length),
                  ('leave', l.apprLeave, n('leave')),
                  ('meeting', l.apprMeetings, n('meeting')),
                  ('car', l.apprPoolCar, n('car')),
                  ('tour', l.apprTours, n('tour')),
                ])
                  if (value == 'all' || count > 0 || _filter == value)
                    ChoiceChip(
                      label: Text('$label · $count'),
                      selected: _filter == value,
                      onSelected: (_) => setState(() => _filter = value),
                    ),
              ],
            ),
            const SizedBox(height: 14),
            if (_loading) ...[
              const SkeletonCard(),
              const SizedBox(height: 10),
              const SkeletonCard(),
            ] else if (_error != null)
              ErrorPanel(error: _error!, onRetry: _load)
            else if (shown.isEmpty)
              EmptyState(
                icon: Icons.fact_check_outlined,
                title: l.apprEmpty,
                message: l.apprEmptyHint,
              )
            else
              for (final item in shown)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _ApprovalCard(
                    item: item,
                    busy: _busy.contains(item.id),
                    onOpen: () async {
                      await context.push(item.route);
                      if (mounted) unawaited(_load());
                    },
                    onApprove: () => _decide(item, true),
                    onReject: () => _decide(item, false),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _ApprovalCard extends StatelessWidget {
  const _ApprovalCard({
    required this.item,
    required this.busy,
    required this.onOpen,
    required this.onApprove,
    required this.onReject,
  });

  final ApprovalItem item;
  final bool busy;
  final VoidCallback onOpen;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final locale = Localizations.localeOf(context).languageCode;
    final tour = item.kind == 'tour';
    final meeting = item.kind == 'meeting';
    final awaiting = switch (item.awaiting) {
      'VETTING' => l.apprAwaitingVETTING,
      'SANCTION' => l.apprAwaitingSANCTION,
      'HR' => l.apprAwaitingHR,
      'ANSWER' => l.apprAwaitingANSWER,
      _ => l.apprAwaitingHOD,
    };
    final when = item.start == null
        ? null
        : switch (item.kind) {
            'leave' => leaveWhen(
              l,
              item.start!,
              item.end ?? item.start!,
              item.halfDay,
            ),
            'meeting' => meetingWhen(l, item.start!, item.minutes ?? 30),
            'tour' when item.end != null =>
              '${dayAndTime(item.start!, locale).split(',').first} – ${dayAndTime(item.end!, locale).split(',').first}',
            _ => dayAndTime(item.start!, locale),
          };
    final (IconData icon, Color fg, Color bg) = switch (item.kind) {
      'tour' => (
        Icons.flight_takeoff_rounded,
        const Color(0xFF4B4FC4),
        const Color(0xFFECEDFB),
      ),
      'leave' => (
        Icons.beach_access_rounded,
        const Color(0xFFC0466A),
        const Color(0xFFFBEAF0),
      ),
      'meeting' => (
        Icons.event_rounded,
        const Color(0xFF8E4EC6),
        const Color(0xFFF3ECFA),
      ),
      _ => (
        Icons.directions_car_filled_rounded,
        const Color(0xFF0E8A8A),
        const Color(0xFFE2F3F3),
      ),
    };
    final title = item.kind == 'leave' && item.leaveType != null
        ? '${leaveTypeLabel(l, item.leaveType!)} · ${leaveDays(l, item.days ?? 1)}'
        : item.title;
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
                child: Icon(icon, color: fg, size: 23),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AbgText.bodyStrong.copyWith(fontSize: 15),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${item.reference} · ${l.apprRequestedBy(item.requester)}',
                      style: AbgText.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (item.requesterRole != null)
                      Text(
                        item.requesterRole!,
                        style: AbgText.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              ToneBadge(
                label: awaiting,
                tone: Tone.pending,
                icon: Icons.hourglass_top_rounded,
                dense: true,
              ),
              if (tour)
                ToneBadge(
                  label: item.foreign ? l.apprForeign : l.apprLocal,
                  tone: item.foreign ? Tone.active : Tone.neutral,
                  icon: item.foreign
                      ? Icons.public_rounded
                      : Icons.place_outlined,
                  dense: true,
                ),
              if (item.urgent)
                ToneBadge(
                  label: l.apprUrgent,
                  tone: Tone.danger,
                  icon: Icons.bolt_rounded,
                  dense: true,
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (item.destination != null && item.destination!.isNotEmpty)
            _Line(icon: Icons.place_outlined, text: item.destination!),
          if (meeting && item.host != null && item.host!.isNotEmpty)
            _Line(
              icon: Icons.person_outline_rounded,
              text: l.aptWith(item.host!),
            ),
          if (item.kind == 'leave' && item.title.isNotEmpty)
            _Line(icon: Icons.notes_rounded, text: '“${item.title}”'),
          if (when != null) _Line(icon: Icons.event_outlined, text: when),
          if (item.budget != null)
            _Line(
              icon: Icons.payments_outlined,
              text: l.apprBudget(_taka(item.budget!)),
            ),
          if (item.passengers != null)
            _Line(
              icon: Icons.groups_outlined,
              text: l.apprPassengers(item.passengers!),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: busy ? null : onReject,
                  icon: const Icon(Icons.close_rounded, size: 18),
                  label: Text(meeting ? l.aptActDecline : l.apprReject),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AbgColors.danger,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: busy ? null : onApprove,
                  icon: busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.check_rounded, size: 18),
                  label: Text(meeting ? l.aptActConfirm : l.apprApprove),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _taka(int v) {
    final s = v.toString();
    // Bangladeshi grouping: 12,34,567.
    if (s.length <= 3) return s;
    final last3 = s.substring(s.length - 3);
    var rest = s.substring(0, s.length - 3);
    final parts = <String>[];
    while (rest.length > 2) {
      parts.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) parts.insert(0, rest);
    return '${parts.join(',')},$last3';
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 4),
    child: Row(
      children: [
        Icon(icon, size: 16, color: AbgColors.inkSubtle),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: AbgText.small,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    ),
  );
}

/// Approve: optional note. Reject: a reason is required. Null when cancelled.
Future<String?> _askNote(
  BuildContext context, {
  required bool approve,
  bool meeting = false,
}) {
  final l = L.of(context);
  final controller = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) {
        final text = controller.text.trim();
        final ok = approve || text.length >= 3;
        return AlertDialog(
          title: Text(
            meeting
                ? (approve
                      ? l.apprConfirmMeetingTitle
                      : l.apprDeclineMeetingTitle)
                : (approve ? l.apprApproveTitle : l.apprRejectTitle),
          ),
          content: TextField(
            controller: controller,
            autofocus: true,
            maxLines: 3,
            maxLength: 1000,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              labelText: approve ? l.apprNote : l.apprRejectReason,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text(l.cancel),
            ),
            FilledButton(
              onPressed: ok ? () => Navigator.of(ctx).pop(text) : null,
              style: approve
                  ? null
                  : FilledButton.styleFrom(backgroundColor: AbgColors.danger),
              child: Text(
                meeting
                    ? (approve ? l.aptActConfirm : l.aptActDecline)
                    : (approve ? l.apprApprove : l.apprReject),
              ),
            ),
          ],
        );
      },
    ),
  );
}
