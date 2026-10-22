import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/formatting.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import '../widgets/vocab.dart';
import 'my_reports_screen.dart';

/// One report: what was reported, the stage it has reached (Reported ➔
/// Acknowledged ➔ Under Investigation ➔ Closed, with who and when), how it was
/// resolved, and everything the team has said about it.
class IncidentDetailScreen extends StatefulWidget {
  const IncidentDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<IncidentDetailScreen> createState() => _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends State<IncidentDetailScreen> {
  Incident? _incident;
  Object? _error;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final incident = await context.read<DispatchRepository>().incident(
        widget.id,
      );
      if (mounted) setState(() => (_incident = incident, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _addPhoto(ImageSource source) async {
    final l = L.of(context);
    final file = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1600,
      imageQuality: 82,
    );
    if (file == null || !mounted) return;
    setState(() => _uploading = true);
    try {
      final updated = await context.read<DispatchRepository>().addIncidentPhoto(
        widget.id,
        bytes: await file.readAsBytes(),
        filename: file.name,
      );
      if (!mounted) return;
      setState(() => _incident = updated);
      showSnack(context, l.incPhotoAdded);
    } on ApiException catch (e) {
      if (mounted) {
        showSnack(
          context,
          e.isNetwork ? l.incOfflineNotice : e.message,
          error: true,
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _view(List<IncidentPhoto> photos, int index) {
    unawaited(
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (_) => _PhotoViewer(photos: photos, initial: index),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final i = _incident;
    final closingNote = i?.updates.reversed
        .where((u) => u.type == 'STATUS_CHANGED' && u.toStatus == 'CLOSED')
        .map((u) => u.note)
        .firstOrNull;
    return Scaffold(
      appBar: AppBar(title: Text(i?.referenceNumber ?? l.incReport)),
      body: _error != null
          ? Padding(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              child: ErrorPanel(error: _error!, onRetry: _load),
            )
          : i == null
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
                  _Header(incident: i),
                  const SizedBox(height: 16),
                  IncidentStageTracker(stages: i.stages),
                  if (i.status == 'CLOSED' && i.resolution != null) ...[
                    const SizedBox(height: 16),
                    _ResolutionCard(
                      resolution: i.resolution!,
                      note: closingNote,
                      at: i.closedAt,
                    ),
                  ] else if (i.statusNote != null &&
                      i.statusNote!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _AdminNote(note: i.statusNote!),
                  ],
                  if (i.photos.any((p) => !p.isFix) ||
                      i.actions.contains('ADD_PHOTO')) ...[
                    const SizedBox(height: 22),
                    SectionTitle(l.incPhotos),
                    _Gallery(
                      photos: i.photos.where((p) => !p.isFix).toList(),
                      onOpen: _view,
                    ),
                    if (i.actions.contains('ADD_PHOTO')) ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _uploading
                                  ? null
                                  : () => _addPhoto(ImageSource.camera),
                              icon: _uploading
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.add_a_photo_outlined),
                              label: Text(l.incAddPhoto),
                            ),
                          ),
                          const SizedBox(width: 10),
                          IconButton.outlined(
                            tooltip: l.incChoosePhoto,
                            onPressed: _uploading
                                ? null
                                : () => _addPhoto(ImageSource.gallery),
                            icon: const Icon(Icons.photo_library_outlined),
                          ),
                        ],
                      ),
                    ],
                  ],
                  if (i.photos.any((p) => p.isFix)) ...[
                    const SizedBox(height: 22),
                    SectionTitle(l.incFixPhotos),
                    _Gallery(
                      photos: i.photos.where((p) => p.isFix).toList(),
                      onOpen: _view,
                    ),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.incHistory),
                  _History(updates: i.updates),
                ],
              ),
            ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.incident});
  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final i = incident;
    final place = [
      i.locationPath ?? i.branchName,
      i.locationDetail,
    ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: AbgGradients.hero,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  incidentCategoryIcon(i.category),
                  color: AbgColors.platinumBright,
                  size: 21,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      incidentGroupLabel(l, i.group),
                      style: AbgText.caption.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      incidentCategoryLabel(l, i.category),
                      style: AbgText.small.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AbgColors.ink,
                      ),
                    ),
                  ],
                ),
              ),
              IncidentStatusChip(i.status),
            ],
          ),
          const SizedBox(height: 14),
          Text(i.title, style: AbgText.h2),
          if (i.description.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              i.description,
              style: AbgText.body.copyWith(color: AbgColors.inkMuted),
            ),
          ],
          const SizedBox(height: 14),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              IncidentSeverityTag(i.severity, dense: false),
              if (i.confidential)
                ToneBadge(
                  label: l.incConfidentialBadge,
                  tone: Tone.neutral,
                  icon: Icons.lock_outline_rounded,
                ),
              if (i.anonymous)
                ToneBadge(
                  label: l.incAnonymousBadge,
                  tone: Tone.neutral,
                  icon: Icons.visibility_off_outlined,
                ),
            ],
          ),
          if (i.confidential && i.isReporter) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AbgColors.surface,
                borderRadius: BorderRadius.circular(AbgRadii.md),
                border: Border.all(color: AbgColors.border),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.lock_outline_rounded,
                    size: 18,
                    color: AbgColors.navy500,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(l.incConfidentialDetail, style: AbgText.small),
                  ),
                ],
              ),
            ),
          ],
          const Divider(height: 26),
          InfoRow(icon: Icons.place_outlined, label: l.incWhere, value: place),
          InfoRow(
            icon: Icons.schedule_rounded,
            label: l.incReportedOn,
            value: fullStamp(i.createdAt, l.localeName),
          ),
          if (!i.isReporter && i.reporterName != null)
            InfoRow(
              icon: Icons.person_outline_rounded,
              label: l.incReportedBy,
              value: i.reporterName!,
            ),
        ],
      ),
    );
  }
}

/// Reported ➔ Acknowledged ➔ Under Investigation ➔ Closed, top to bottom,
/// with who moved it and when. A stage passed over shows as skipped.
class IncidentStageTracker extends StatelessWidget {
  const IncidentStageTracker({super.key, required this.stages});
  final List<IncidentStage> stages;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final waiting = stages.isNotEmpty && stages.first.state == 'current';
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l.incProgress, style: AbgText.h3),
          const SizedBox(height: 14),
          for (var k = 0; k < stages.length; k++)
            _StageRow(
              stage: stages[k],
              last: k == stages.length - 1,
              nextReached:
                  k + 1 < stages.length &&
                  stages.skip(k + 1).any((s) => s.reached),
            ),
          if (waiting) ...[
            const SizedBox(height: 4),
            Text(l.incWaitingForAdmin, style: AbgText.small),
            const SizedBox(height: 6),
          ],
        ],
      ),
    );
  }
}

class _StageRow extends StatelessWidget {
  const _StageRow({
    required this.stage,
    required this.last,
    required this.nextReached,
  });
  final IncidentStage stage;
  final bool last;
  final bool nextReached;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final s = stage;
    final done = s.state == 'done';
    final current = s.state == 'current';
    final skipped = s.state == 'skipped';
    final closed = s.status == 'CLOSED';
    final fill = done
        ? (closed ? AbgColors.success : AbgColors.navy)
        : current
        ? AbgColors.white
        : AbgColors.surface;
    final detail = [
      if (skipped) l.incStageSkipped,
      if (current && s.at == null) l.incStageNow,
      if (s.at != null && !skipped) dayAndTime(s.at!, l.localeName),
      if (s.by != null && (done || current)) s.by!,
    ].join(' · ');
    return Semantics(
      label: '${incidentStatusLabel(l, s.status)}. $detail',
      child: ExcludeSemantics(
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: 34,
                child: Column(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: fill,
                        border: Border.all(
                          color: done
                              ? Colors.transparent
                              : current
                              ? AbgColors.navy
                              : AbgColors.borderStrong,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        done
                            ? Icons.check_rounded
                            : incidentStatusIcon(s.status),
                        size: 17,
                        color: done
                            ? Colors.white
                            : current
                            ? AbgColors.navy
                            : AbgColors.inkSubtle,
                      ),
                    ),
                    if (!last)
                      Expanded(
                        child: Container(
                          width: 2,
                          margin: const EdgeInsets.symmetric(vertical: 2),
                          color: nextReached
                              ? AbgColors.navy
                              : AbgColors.softSilver,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: 6, bottom: last ? 4 : 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        incidentStatusLabel(l, s.status),
                        style: AbgText.bodyStrong.copyWith(
                          fontSize: 14.5,
                          color: done || current
                              ? AbgColors.navy
                              : AbgColors.inkSubtle,
                        ),
                      ),
                      if (detail.isNotEmpty)
                        Text(detail, style: AbgText.caption),
                      if (closed && done && s.resolution != null) ...[
                        const SizedBox(height: 6),
                        ToneBadge(
                          label: incidentResolutionLabel(l, s.resolution!),
                          tone: incidentResolutionTone(s.resolution!),
                          icon: incidentResolutionIcon(s.resolution!),
                          dense: true,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResolutionCard extends StatelessWidget {
  const _ResolutionCard({required this.resolution, this.note, this.at});
  final String resolution;
  final String? note;
  final DateTime? at;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final c = toneColors(incidentResolutionTone(resolution));
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        border: Border.all(color: c.fg.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(incidentResolutionIcon(resolution), color: c.fg),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.incClosedAs(incidentResolutionLabel(l, resolution)),
                  style: AbgText.bodyStrong.copyWith(color: c.fg),
                ),
                const SizedBox(height: 2),
                Text(
                  incidentResolutionHint(l, resolution),
                  style: AbgText.small.copyWith(color: AbgColors.ink),
                ),
                if (note != null && note!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    '“$note”',
                    style: AbgText.body.copyWith(color: AbgColors.ink),
                  ),
                ],
                if (at != null) ...[
                  const SizedBox(height: 6),
                  Text(dayAndTime(at!, l.localeName), style: AbgText.caption),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AdminNote extends StatelessWidget {
  const _AdminNote({required this.note});
  final String note;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.support_agent_rounded, color: AbgColors.platinum),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  L.of(context).incAdminUpdate,
                  style: AbgText.caption.copyWith(
                    color: AbgColors.platinumDeep,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(note, style: AbgText.body.copyWith(color: Colors.white)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Gallery extends StatelessWidget {
  const _Gallery({required this.photos, required this.onOpen});

  final List<IncidentPhoto> photos;
  final void Function(List<IncidentPhoto>, int) onOpen;

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 132,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: photos.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, k) => InkWell(
          borderRadius: BorderRadius.circular(AbgRadii.md),
          onTap: () => onOpen(photos, k),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AbgRadii.md),
            child: Image.network(
              apiUrl(photos[k].url),
              width: 170,
              height: 132,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                width: 170,
                color: AbgColors.platinumBright,
                child: const Icon(
                  Icons.broken_image_outlined,
                  color: AbgColors.inkSubtle,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _History extends StatelessWidget {
  const _History({required this.updates});
  final List<IncidentUpdate> updates;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final items = updates.reversed.toList();
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
                          incidentHistoryLabel(l, items[k]),
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

  IconData _icon(IncidentUpdate u) => switch (u.type) {
    'SUBMITTED' => Icons.campaign_rounded,
    'STATUS_CHANGED' when u.reopened => Icons.replay_rounded,
    'STATUS_CHANGED' when u.toStatus == 'CLOSED' => incidentResolutionIcon(
      u.resolution ?? 'RESOLVED',
    ),
    'STATUS_CHANGED' => incidentStatusIcon(u.toStatus ?? ''),
    'NOTE_ADDED' => Icons.chat_bubble_outline_rounded,
    'PHOTO_ADDED' => Icons.photo_camera_outlined,
    _ => Icons.edit_note_rounded,
  };

  Color _tone(IncidentUpdate u) => switch (u.type) {
    'STATUS_CHANGED' when u.reopened => AbgColors.pending,
    'STATUS_CHANGED' when u.toStatus == 'CLOSED' => toneColors(
      incidentResolutionTone(u.resolution ?? 'RESOLVED'),
    ).fg,
    'STATUS_CHANGED' => toneColors(incidentStatusTone(u.toStatus ?? '')).fg,
    _ => AbgColors.navy500,
  };
}

/// What a history entry says, in the reader's language.
String incidentHistoryLabel(L l, IncidentUpdate u) => switch (u.type) {
  'SUBMITTED' => l.incEvSubmitted,
  'STATUS_CHANGED' when u.reopened => l.incEvReopened,
  'STATUS_CHANGED' when u.toStatus == 'ACKNOWLEDGED' => l.incEvAcknowledged,
  'STATUS_CHANGED' when u.toStatus == 'CLOSED' => l.incEvClosed(
    incidentResolutionLabel(l, u.resolution ?? 'RESOLVED'),
  ),
  'STATUS_CHANGED' => l.incEvInvestigation,
  'NOTE_ADDED' => l.incEvNote,
  'PHOTO_ADDED' => l.incEvPhoto,
  _ => l.incEvDetails,
};

class _PhotoViewer extends StatelessWidget {
  const _PhotoViewer({required this.photos, required this.initial});

  final List<IncidentPhoto> photos;
  final int initial;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: PageView.builder(
        controller: PageController(initialPage: initial),
        itemCount: photos.length,
        itemBuilder: (_, k) => InteractiveViewer(
          child: Center(
            child: Image.network(apiUrl(photos[k].url), fit: BoxFit.contain),
          ),
        ),
      ),
    );
  }
}
