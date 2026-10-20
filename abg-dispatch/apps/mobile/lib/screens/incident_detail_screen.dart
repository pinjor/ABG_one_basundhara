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

/// One report: what was reported, where it stands, and everything the admin
/// team has said about it.
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

  Future<void> _addPhoto() async {
    final l = L.of(context);
    final file = await ImagePicker().pickImage(
      source: ImageSource.camera,
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
                  _Progress(incident: i),
                  if (i.statusNote != null && i.statusNote!.isNotEmpty) ...[
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
                      OutlinedButton.icon(
                        onPressed: _uploading ? null : _addPhoto,
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
                  color: AbgColors.platinumBright,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  incidentCategoryIcon(i.category),
                  color: AbgColors.navy500,
                  size: 21,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  incidentCategoryLabel(l, i.category),
                  style: AbgText.small.copyWith(fontWeight: FontWeight.w600),
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
              ToneBadge(
                label: incidentSeverityLabel(l, i.severity),
                tone: incidentSeverityTone(i.severity),
                icon: Icons.flag_outlined,
                dense: true,
              ),
              if (i.anonymous)
                ToneBadge(
                  label: l.incAnonymousBadge,
                  tone: Tone.neutral,
                  icon: Icons.visibility_off_outlined,
                  dense: true,
                ),
            ],
          ),
          const Divider(height: 26),
          InfoRow(icon: Icons.place_outlined, label: l.incWhere, value: place),
          InfoRow(
            icon: Icons.schedule_rounded,
            label: l.incStepSubmitted,
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

/// Submitted → Processing → Done (or Declined), with the time of each step.
class _Progress extends StatelessWidget {
  const _Progress({required this.incident});
  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final i = incident;
    final declined = i.status == 'DECLINED';
    final steps = [
      (l.incStepSubmitted, i.createdAt, true, Icons.campaign_rounded),
      (
        l.incStepProcessing,
        i.processingAt,
        i.status != 'PENDING' && i.processingAt != null,
        Icons.construction_rounded,
      ),
      declined
          ? (
              l.incStepDeclined,
              i.declinedAt,
              true,
              Icons.do_not_disturb_on_outlined,
            )
          : (
              l.incStepDone,
              i.doneAt,
              i.status == 'DONE',
              Icons.task_alt_rounded,
            ),
    ];
    final current = switch (i.status) {
      'PENDING' => 0,
      'PROCESSING' => 1,
      _ => 2,
    };
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 12),
            child: Text(l.incProgress, style: AbgText.h3),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var s = 0; s < steps.length; s++)
                Expanded(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 2,
                              color: s == 0
                                  ? Colors.transparent
                                  : (s <= current
                                        ? AbgColors.navy
                                        : AbgColors.softSilver),
                            ),
                          ),
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: steps[s].$3
                                  ? (declined && s == 2
                                        ? AbgColors.neutral
                                        : s == 2
                                        ? AbgColors.success
                                        : AbgColors.navy)
                                  : AbgColors.white,
                              border: Border.all(
                                color: steps[s].$3
                                    ? Colors.transparent
                                    : (s == current + 1
                                          ? AbgColors.navy
                                          : AbgColors.borderStrong),
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              steps[s].$4,
                              size: 17,
                              color: steps[s].$3
                                  ? Colors.white
                                  : AbgColors.inkSubtle,
                            ),
                          ),
                          Expanded(
                            child: Container(
                              height: 2,
                              color: s == steps.length - 1
                                  ? Colors.transparent
                                  : (s < current
                                        ? AbgColors.navy
                                        : AbgColors.softSilver),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        steps[s].$1,
                        textAlign: TextAlign.center,
                        style: AbgText.caption.copyWith(
                          fontWeight: FontWeight.w700,
                          color: steps[s].$3
                              ? AbgColors.navy
                              : AbgColors.inkSubtle,
                        ),
                      ),
                      Text(
                        steps[s].$3 && steps[s].$2 != null
                            ? dayAndTime(steps[s].$2!, l.localeName)
                            : '',
                        textAlign: TextAlign.center,
                        style: AbgText.caption.copyWith(fontSize: 11),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (i.status == 'PENDING') ...[
            const SizedBox(height: 12),
            Center(
              child: Text(
                l.incWaitingForAdmin,
                style: AbgText.small,
                textAlign: TextAlign.center,
              ),
            ),
          ],
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

  String _label(L l, IncidentUpdate u) => switch (u.type) {
    'SUBMITTED' => l.incEvSubmitted,
    'STATUS_CHANGED' =>
      u.reopened
          ? l.incEvReopened
          : l.incEvStatus(incidentStatusLabel(l, u.toStatus ?? '')),
    'NOTE_ADDED' => l.incEvNote,
    'PHOTO_ADDED' => l.incEvPhoto,
    _ => l.incEvDetails,
  };

  IconData _icon(IncidentUpdate u) => switch (u.type) {
    'SUBMITTED' => Icons.campaign_rounded,
    'STATUS_CHANGED' => incidentStatusIcon(u.toStatus ?? ''),
    'NOTE_ADDED' => Icons.chat_bubble_outline_rounded,
    'PHOTO_ADDED' => Icons.photo_camera_outlined,
    _ => Icons.edit_note_rounded,
  };

  Color _tone(IncidentUpdate u) => u.type == 'STATUS_CHANGED'
      ? toneColors(incidentStatusTone(u.toStatus ?? '')).fg
      : AbgColors.navy500;
}

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
