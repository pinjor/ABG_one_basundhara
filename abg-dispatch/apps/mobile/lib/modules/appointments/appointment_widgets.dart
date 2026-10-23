import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/module_kit.dart';
import '../../widgets/vocab.dart';
import 'appointment_api.dart';
import 'appointment_models.dart';

// ── Vocabulary: label, tone and icon together ──

String appointmentStatusLabel(L l, String s) => switch (s) {
  'PENDING' => l.aptStatusPENDING,
  'PROPOSED' => l.aptStatusPROPOSED,
  'CONFIRMED' => l.aptStatusCONFIRMED,
  'COMPLETED' => l.aptStatusCOMPLETED,
  'DECLINED' => l.aptStatusDECLINED,
  'CANCELLED' => l.aptStatusCANCELLED,
  _ => s,
};

Tone appointmentStatusTone(String s) => switch (s) {
  'PENDING' || 'PROPOSED' => Tone.pending,
  'CONFIRMED' => Tone.success,
  'COMPLETED' => Tone.active,
  'DECLINED' => Tone.danger,
  _ => Tone.neutral,
};

IconData appointmentStatusIcon(String s) => switch (s) {
  'PENDING' => Icons.hourglass_top_rounded,
  'PROPOSED' => Icons.update_rounded,
  'CONFIRMED' => Icons.event_available_rounded,
  'COMPLETED' => Icons.task_alt_rounded,
  'DECLINED' => Icons.event_busy_rounded,
  'CANCELLED' => Icons.block_rounded,
  _ => Icons.circle_outlined,
};

String appointmentPurposeLabel(L l, String p) => switch (p) {
  'BUSINESS_REVIEW' => l.aptPurposeBUSINESS_REVIEW,
  'APPROVAL' => l.aptPurposeAPPROVAL,
  'PROJECT_UPDATE' => l.aptPurposePROJECT_UPDATE,
  'PROPOSAL' => l.aptPurposePROPOSAL,
  'PERSONAL' => l.aptPurposePERSONAL,
  'COURTESY' => l.aptPurposeCOURTESY,
  _ => l.aptPurposeOTHER,
};

IconData appointmentPurposeIcon(String p) => switch (p) {
  'BUSINESS_REVIEW' => Icons.query_stats_rounded,
  'APPROVAL' => Icons.draw_outlined,
  'PROJECT_UPDATE' => Icons.engineering_outlined,
  'PROPOSAL' => Icons.lightbulb_outline_rounded,
  'PERSONAL' => Icons.person_outline_rounded,
  'COURTESY' => Icons.handshake_outlined,
  _ => Icons.more_horiz_rounded,
};

String meetingModeLabel(L l, String m) => switch (m) {
  'VIDEO' => l.aptModeVIDEO,
  'PHONE' => l.aptModePHONE,
  _ => l.aptModeIN_PERSON,
};

IconData meetingModeIcon(String m) => switch (m) {
  'VIDEO' => Icons.videocam_outlined,
  'PHONE' => Icons.call_outlined,
  _ => Icons.meeting_room_outlined,
};

/// "Tue, 28 Oct · 11:00 AM – 11:30 AM" in Dhaka time; "Today" and "Tomorrow" by name.
String meetingWhen(L l, DateTime at, int minutes) {
  final start = toDhaka(at);
  final end = start.add(Duration(minutes: minutes));
  final today = toDhaka(DateTime.now());
  final dayDiff = DateTime.utc(
    start.year,
    start.month,
    start.day,
  ).difference(DateTime.utc(today.year, today.month, today.day)).inDays;
  final day = switch (dayDiff) {
    0 => l.aptToday,
    1 => l.aptTomorrow,
    _ =>
      start.year == today.year
          ? DateFormat.MMMEd(l.localeName).format(start)
          : DateFormat.yMMMEd(l.localeName).format(start),
  };
  final t = DateFormat.jm(l.localeName);
  return '$day · ${t.format(start)} – ${t.format(end)}';
}

class AppointmentStatusChip extends StatelessWidget {
  const AppointmentStatusChip(
    this.status, {
    super.key,
    this.dense = false,
    this.onDark = false,
  });

  final String status;
  final bool dense;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final label = appointmentStatusLabel(L.of(context), status);
    return Semantics(
      label: 'Status: $label',
      child: ExcludeSemantics(
        child: ToneBadge(
          label: label,
          tone: appointmentStatusTone(status),
          icon: appointmentStatusIcon(status),
          dense: dense,
          onDark: onDark,
        ),
      ),
    );
  }
}

/// A date tile: "28 / OCT".
class _DateBlock extends StatelessWidget {
  const _DateBlock({required this.at});
  final DateTime at;

  @override
  Widget build(BuildContext context) {
    final d = toDhaka(at);
    final locale = L.of(context).localeName;
    return Container(
      width: 50,
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.md),
      ),
      child: Column(
        children: [
          Text(
            DateFormat.d(locale).format(d),
            style: AbgText.h2.copyWith(color: Colors.white, height: 1.1),
          ),
          Text(
            DateFormat.MMM(locale).format(d).toUpperCase(),
            style: AbgText.caption.copyWith(
              color: AbgColors.platinum,
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

/// A meeting request. [hostSide]: shown to the person asked (or their
/// office), so it names the requester instead of the host.
class AppointmentCard extends StatelessWidget {
  const AppointmentCard({
    super.key,
    required this.item,
    required this.onTap,
    this.hostSide = false,
    this.showHost = false,
  });

  final AppointmentRow item;
  final VoidCallback onTap;
  final bool hostSide;

  /// The executive office answers for several people: name who was asked.
  final bool showHost;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = item;
    final who = !hostSide
        ? l.aptWith(a.host.name)
        : showHost
        ? l.aptFromTo(a.requester.name, a.host.name)
        : l.aptFrom(a.requester.name);
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _DateBlock(at: a.when),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  a.subject,
                  style: AbgText.bodyStrong.copyWith(fontSize: 15),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  who,
                  style: AbgText.small.copyWith(color: AbgColors.ink),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(
                      meetingModeIcon(a.mode),
                      size: 14,
                      color: AbgColors.inkSubtle,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        a.status == 'PENDING'
                            ? l.aptAsked(
                                meetingWhen(
                                  l,
                                  a.preferredAt,
                                  a.durationMinutes,
                                ),
                              )
                            : a.status == 'PROPOSED'
                            ? l.aptProposedFor(
                                meetingWhen(l, a.when, a.durationMinutes),
                              )
                            : meetingWhen(l, a.when, a.durationMinutes),
                        style: AbgText.caption,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    AppointmentStatusChip(a.status, dense: true),
                    if (a.urgent && a.isOpen)
                      ToneBadge(
                        label: l.aptUrgent,
                        tone: Tone.danger,
                        icon: Icons.bolt_rounded,
                        dense: true,
                      ),
                    Text(
                      a.referenceNumber,
                      style: AbgText.mono.copyWith(
                        fontSize: 11.5,
                        color: AbgColors.inkSubtle,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Choose who to meet: executives and heads first, then search.
Future<AppointmentHost?> pickHost(BuildContext context, AppointmentsApi api) =>
    showAbgSheet<AppointmentHost>(context, (_) => _HostPicker(api: api));

class _HostPicker extends StatefulWidget {
  const _HostPicker({required this.api});
  final AppointmentsApi api;

  @override
  State<_HostPicker> createState() => _HostPickerState();
}

class _HostPickerState extends State<_HostPicker> {
  final _query = TextEditingController();
  Timer? _debounce;
  List<AppointmentHost> _results = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    unawaited(_search(''));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _changed(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 280), () => _search(q));
  }

  Future<void> _search(String q) async {
    setState(() => _loading = true);
    try {
      final rows = await widget.api.hosts(q.trim().isEmpty ? null : q.trim());
      if (mounted) setState(() => _results = rows);
    } catch (_) {
      if (mounted) setState(() => _results = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.8,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
              child: SheetHeader(title: l.aptChooseHost, hint: l.aptHostHint),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: TextField(
                controller: _query,
                onChanged: _changed,
                decoration: InputDecoration(
                  hintText: l.aptSearchHosts,
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
              ),
            ),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Expanded(
              child: !_loading && _results.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        l.kitNoMatches,
                        style: AbgText.small,
                        textAlign: TextAlign.center,
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                      itemCount: _results.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 2),
                      itemBuilder: (_, i) {
                        final h = _results[i];
                        return ListTile(
                          minTileHeight: kMinTap + 8,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AbgRadii.md),
                          ),
                          leading: HostAvatar(host: h),
                          title: Text(
                            h.name,
                            style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                          ),
                          subtitle: Text(
                            [h.subtitle, h.office]
                                .whereType<String>()
                                .where((s) => s.isNotEmpty)
                                .join(' · '),
                            style: AbgText.caption,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: h.executive
                              ? ToneBadge(
                                  label: l.aptExecutive,
                                  tone: Tone.active,
                                  icon: Icons.star_rounded,
                                  dense: true,
                                )
                              : null,
                          onTap: () => Navigator.pop(context, h),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Initials in a circle, ringed in platinum for the MD and the Chairman.
class HostAvatar extends StatelessWidget {
  const HostAvatar({super.key, required this.host, this.size = 40});

  final AppointmentHost host;
  final double size;

  @override
  Widget build(BuildContext context) {
    final initials = host.name
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty && p != 'Md.')
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();
    final avatar = Avatar(
      initials: initials.isEmpty ? '?' : initials,
      size: size,
    );
    if (!host.executive) return avatar;
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: AbgGradients.platinum,
      ),
      child: avatar,
    );
  }
}

/// A day, then a time, read as Dhaka wall-clock time. Null when cancelled.
Future<DateTime?> pickMeetingTime(
  BuildContext context, {
  DateTime? initial,
  String? help,
}) async {
  final now = toDhaka(DateTime.now());
  final start = initial == null ? null : toDhaka(initial);
  final today = DateTime(now.year, now.month, now.day);
  final day = await showDatePicker(
    context: context,
    firstDate: today,
    lastDate: today.add(const Duration(days: AppointmentLimits.maxLeadDays)),
    initialDate: start != null
        ? DateTime(start.year, start.month, start.day)
        : today,
    helpText: help,
  );
  if (day == null || !context.mounted) return null;
  final time = await showTimePicker(
    context: context,
    initialTime: start != null
        ? TimeOfDay(hour: start.hour, minute: start.minute)
        : const TimeOfDay(hour: 11, minute: 0),
    helpText: help,
  );
  if (time == null) return null;
  return dhakaInstant(day.year, day.month, day.day, time.hour, time.minute);
}

/// The sentence for a refused meeting time.
String meetingProblemText(L l, String code) => switch (code) {
  'past' => l.aptErrPast,
  'far' => l.aptErrFar,
  _ => l.aptErrHours,
};
