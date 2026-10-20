import 'package:flutter/material.dart';

import '../core/formatting.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import 'vocab.dart';

const _upcoming = [
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_AT_DESTINATION',
  'PENDING_RECEIPT',
  'RECEIVED',
];

/// The chain of custody, oldest first. Completed entries are solid; the
/// remaining happy-path steps are drawn hollow so the user sees what's next.
class CustodyTimeline extends StatelessWidget {
  const CustodyTimeline({
    super.key,
    required this.events,
    required this.status,
  });

  final List<TimelineEvent> events;
  final String status;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final reached = events.map((e) => e.toStatus).whereType<String>().toSet();
    final terminal = ['RECEIVED', 'RETURNED', 'CANCELLED'].contains(status);
    final pending =
        terminal ||
            [
              'DELIVERY_EXCEPTION',
              'ON_HOLD',
              'DELIVERY_FAILED',
              'RETURN_REQUESTED',
              'RETURN_IN_TRANSIT',
              'DRAFT',
            ].contains(status)
        ? <String>[]
        : _upcoming.where((s) => !reached.contains(s)).toList();
    final rows = <Widget>[];
    for (var i = 0; i < events.length; i++) {
      rows.add(
        _EventRow(
          event: events[i],
          last: i == events.length - 1 && pending.isEmpty,
        ),
      );
    }
    for (var i = 0; i < pending.length; i++) {
      rows.add(
        _UpcomingRow(
          label: statusLabel(l, pending[i]),
          last: i == pending.length - 1,
        ),
      );
    }
    return Column(children: rows);
  }
}

class _Rail extends StatelessWidget {
  const _Rail({
    required this.child,
    required this.last,
    this.hollow = false,
    this.color = AbgColors.navy,
  });

  final Widget child;
  final bool last;
  final bool hollow;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: hollow
                        ? AbgColors.white
                        : color.withValues(alpha: 0.10),
                    border: Border.all(
                      color: hollow
                          ? AbgColors.borderStrong
                          : color.withValues(alpha: 0.35),
                      width: hollow ? 1.5 : 1,
                    ),
                  ),
                  child: child,
                ),
                if (!last)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 2),
                      decoration: BoxDecoration(
                        color: hollow
                            ? AbgColors.border
                            : AbgColors.borderStrong,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event, required this.last});

  final TimelineEvent event;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final tone = toneColors(eventTone(event.type));
    final e = event;
    final who = e.actorCode != null && e.actorCode!.isNotEmpty
        ? '${e.actorName} · ${e.actorCode}'
        : e.actorName;
    return Semantics(
      label: '${e.label}, ${dayAndTime(e.at, l.localeName)}, $who',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Rail(
            last: last,
            color: tone.fg,
            child: Icon(eventIcon(e.type), size: 18, color: tone.fg),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 18, top: 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          e.label,
                          style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        dayAndTime(e.at, l.localeName),
                        style: AbgText.mono.copyWith(
                          fontSize: 12,
                          color: AbgColors.inkMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(who, style: AbgText.small),
                  if (e.location != null && e.location!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.place_outlined,
                            size: 13,
                            color: AbgColors.inkSubtle,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(e.location!, style: AbgText.caption),
                          ),
                        ],
                      ),
                    ),
                  if (e.verification != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AbgColors.successSoft,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.verified_user_outlined,
                              size: 13,
                              color: AbgColors.success,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              e.verification!,
                              style: AbgText.caption.copyWith(
                                color: AbgColors.success,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (e.notes != null && e.notes!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        '“${e.notes}”',
                        style: AbgText.small.copyWith(
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  if (e.corrected)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        'Corrected later — see the correction entry.',
                        style: AbgText.caption.copyWith(
                          color: AbgColors.pending,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UpcomingRow extends StatelessWidget {
  const _UpcomingRow({required this.label, required this.last});

  final String label;
  final bool last;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Rail(last: last, hollow: true, child: const SizedBox()),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 18),
            child: Text(
              label,
              style: AbgText.body.copyWith(
                color: AbgColors.inkSubtle,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
