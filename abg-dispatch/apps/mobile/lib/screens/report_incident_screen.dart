import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../core/api_client.dart';
import '../core/session.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import '../widgets/vocab.dart';

/// "See something, say something": one screen, a few taps, a photo, sent.
class ReportIncidentScreen extends StatefulWidget {
  const ReportIncidentScreen({super.key});

  @override
  State<ReportIncidentScreen> createState() => _ReportIncidentScreenState();
}

class _Picked {
  _Picked(this.bytes, this.name);
  final Uint8List bytes;
  final String name;
}

class _ReportIncidentScreenState extends State<ReportIncidentScreen> {
  // One key per form: a retried submit can never file the report twice.
  final _idempotencyKey = const Uuid().v4();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _spot = TextEditingController();
  final _photos = <_Picked>[];
  String? _category;
  String _severity = 'MEDIUM';
  bool _anonymous = false;
  bool _busy = false;
  String? _branchId;
  String? _locationId;
  List<Option> _branches = [];
  List<Option> _locations = [];

  @override
  void initState() {
    super.initState();
    _branchId = context.read<SessionController>().profile?.employee?.branchId;
    unawaited(_loadPlaces());
    _title.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _spot.dispose();
    super.dispose();
  }

  Future<void> _loadPlaces() async {
    final repo = context.read<DispatchRepository>();
    try {
      final branches = await repo.branches();
      final locations = _branchId == null
          ? <Option>[]
          : await repo.locations(_branchId!);
      if (!mounted) return;
      setState(() {
        _branches = branches;
        _branchId ??= branches.isNotEmpty ? branches.first.id : null;
        _locations = locations;
      });
    } catch (_) {
      // The form still works without the place list; the office defaults to the reporter's own.
    }
  }

  Future<void> _changeBranch(String? id) async {
    setState(() {
      _branchId = id;
      _locationId = null;
      _locations = [];
    });
    if (id == null) return;
    final locations = await context.read<DispatchRepository>().locations(id);
    if (mounted && _branchId == id) setState(() => _locations = locations);
  }

  Future<void> _pick(ImageSource source) async {
    final file = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1600,
      imageQuality: 82,
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    if (mounted && _photos.length < maxIncidentPhotos) {
      setState(() => _photos.add(_Picked(bytes, file.name)));
    }
  }

  bool get _valid => _category != null && _title.text.trim().length >= 3;

  Future<void> _submit() async {
    final l = L.of(context);
    if (!_valid) {
      showSnack(
        context,
        _category == null ? l.incCategoryRequired : l.incTitleRequired,
        error: true,
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final incident = await context.read<DispatchRepository>().reportIncident(
        fields: {
          'title': _title.text.trim(),
          'description': _description.text.trim(),
          'category': _category!,
          'severity': _severity,
          'branchId': ?_branchId,
          'locationId': ?_locationId,
          if (_spot.text.trim().isNotEmpty) 'locationDetail': _spot.text.trim(),
          'anonymous': '$_anonymous',
        },
        photos: [for (final p in _photos) UploadFile(p.bytes, p.name)],
        idempotencyKey: _idempotencyKey,
      );
      if (!mounted) return;
      showSnack(context, l.incSubmitted(incident.referenceNumber));
      context.pushReplacement('/incidents/${incident.id}');
    } on ApiException catch (e) {
      if (mounted) {
        showSnack(
          context,
          e.isNetwork ? l.incOfflineNotice : e.message,
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
      appBar: AppBar(title: Text(l.incReport)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          8,
          AbgSpace.gutter,
          32,
        ),
        children: [
          _Intro(text: l.incReportHint),
          const SizedBox(height: 22),
          SectionTitle(l.incWhatKind),
          _CategoryGrid(
            selected: _category,
            onSelected: (c) => setState(() {
              // Misconduct is the classic whistle-blowing case: start anonymous.
              if (c == 'MISCONDUCT' && _category != 'MISCONDUCT') {
                _anonymous = true;
              }
              _category = c;
            }),
          ),
          if (_category == 'MISCONDUCT') ...[
            const SizedBox(height: 10),
            _Note(
              icon: Icons.verified_user_outlined,
              text: l.incMisconductNote,
            ),
          ],
          const SizedBox(height: 22),
          TextField(
            controller: _title,
            maxLength: 120,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: '${l.incTitleLabel} *',
              hintText: l.incTitleHint,
            ),
          ),
          const SizedBox(height: 4),
          TextField(
            controller: _description,
            minLines: 3,
            maxLines: 6,
            maxLength: 2000,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: l.incDescriptionLabel),
          ),
          const SizedBox(height: 14),
          SectionTitle(l.incPhotos),
          Text(l.incPhotosHint, style: AbgText.small),
          const SizedBox(height: 12),
          _PhotoStrip(
            photos: _photos,
            onRemove: (i) => setState(() => _photos.removeAt(i)),
            onCamera: () => _pick(ImageSource.camera),
            onGallery: () => _pick(ImageSource.gallery),
          ),
          const SizedBox(height: 24),
          SectionTitle(l.incWhere),
          DropdownButtonFormField<String>(
            initialValue: _branches.any((b) => b.id == _branchId)
                ? _branchId
                : null,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: l.incOffice,
              prefixIcon: const Icon(Icons.apartment_rounded),
            ),
            items: [
              for (final b in _branches)
                DropdownMenuItem(
                  value: b.id,
                  child: Text(b.label, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: _busy ? null : _changeBranch,
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String?>(
            key: ValueKey('area-$_branchId-${_locations.length}'),
            initialValue: _locationId,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: l.incArea,
              prefixIcon: const Icon(Icons.place_outlined),
            ),
            items: [
              DropdownMenuItem<String?>(
                value: null,
                child: Text(
                  l.incAreaAny,
                  style: const TextStyle(color: AbgColors.inkMuted),
                ),
              ),
              for (final loc in _locations)
                DropdownMenuItem<String?>(
                  value: loc.id,
                  child: Text(
                    loc.subtitle ?? loc.label,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: _busy ? null : (v) => setState(() => _locationId = v),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _spot,
            maxLength: 160,
            decoration: InputDecoration(
              labelText: l.incSpot,
              hintText: l.incSpotHint,
              prefixIcon: const Icon(Icons.my_location_rounded),
            ),
          ),
          const SizedBox(height: 10),
          SectionTitle(l.incHowUrgent),
          _SeverityPicker(
            selected: _severity,
            onSelected: (s) => setState(() => _severity = s),
          ),
          const SizedBox(height: 22),
          SectionCard(
            padding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
            child: SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _anonymous,
              onChanged: (v) => setState(() => _anonymous = v),
              secondary: const Icon(
                Icons.visibility_off_outlined,
                color: AbgColors.navy500,
              ),
              title: Text(
                l.incAnonymous,
                style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
              ),
              subtitle: Text(l.incAnonymousHint, style: AbgText.caption),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: const BoxDecoration(
            color: AbgColors.white,
            border: Border(top: BorderSide(color: AbgColors.border)),
          ),
          child: FilledButton.icon(
            onPressed: _busy ? null : _submit,
            icon: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_rounded),
            label: Text(l.incSubmit),
          ),
        ),
      ),
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              gradient: AbgGradients.platinum,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.campaign_rounded, color: AbgColors.navy),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              text,
              style: AbgText.small.copyWith(
                color: AbgColors.platinumBright,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AbgColors.activeSoft,
        borderRadius: BorderRadius.circular(AbgRadii.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AbgColors.active),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: AbgText.small.copyWith(color: AbgColors.navy),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryGrid extends StatelessWidget {
  const _CategoryGrid({required this.selected, required this.onSelected});

  final String? selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    // Plain rows rather than a GridView: a nested scrollable would swallow
    // mouse-wheel scrolling on web and desktop.
    const perRow = 3;
    final rows = <List<String>>[
      for (var i = 0; i < incidentCategories.length; i += perRow)
        incidentCategories.sublist(
          i,
          (i + perRow).clamp(0, incidentCategories.length),
        ),
    ];
    return Column(
      children: [
        for (var r = 0; r < rows.length; r++) ...[
          if (r > 0) const SizedBox(height: 8),
          Row(
            children: [
              for (var c = 0; c < perRow; c++) ...[
                if (c > 0) const SizedBox(width: 8),
                Expanded(
                  child: c < rows[r].length
                      ? SizedBox(
                          height: 92,
                          child: _CategoryTile(
                            label: incidentCategoryLabel(l, rows[r][c]),
                            icon: incidentCategoryIcon(rows[r][c]),
                            selected: selected == rows[r][c],
                            onTap: () => onSelected(rows[r][c]),
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
              ],
            ],
          ),
        ],
      ],
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: ExcludeSemantics(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          decoration: BoxDecoration(
            color: selected ? AbgColors.navy : AbgColors.white,
            borderRadius: BorderRadius.circular(AbgRadii.md),
            border: Border.all(
              color: selected ? AbgColors.navy : AbgColors.border,
            ),
            boxShadow: selected ? AbgShadows.card : null,
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(AbgRadii.md),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    icon,
                    size: 24,
                    color: selected
                        ? AbgColors.platinumBright
                        : AbgColors.navy500,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    label,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AbgText.caption.copyWith(
                      color: selected ? Colors.white : AbgColors.ink,
                      fontWeight: FontWeight.w700,
                      height: 1.15,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PhotoStrip extends StatelessWidget {
  const _PhotoStrip({
    required this.photos,
    required this.onRemove,
    required this.onCamera,
    required this.onGallery,
  });

  final List<_Picked> photos;
  final ValueChanged<int> onRemove;
  final VoidCallback onCamera;
  final VoidCallback onGallery;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final full = photos.length >= maxIncidentPhotos;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (photos.isNotEmpty) ...[
          Row(
            children: [
              for (var i = 0; i < photos.length; i++) ...[
                if (i > 0) const SizedBox(width: 10),
                Expanded(
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(AbgRadii.md),
                          child: Image.memory(
                            photos[i].bytes,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          top: 6,
                          right: 6,
                          child: Material(
                            color: AbgColors.navy.withValues(alpha: 0.75),
                            shape: const CircleBorder(),
                            child: IconButton(
                              tooltip: l.incRemovePhoto,
                              visualDensity: VisualDensity.compact,
                              icon: const Icon(
                                Icons.close_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                              onPressed: () => onRemove(i),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              for (var i = photos.length; i < maxIncidentPhotos; i++) ...[
                const SizedBox(width: 10),
                const Expanded(
                  child: AspectRatio(aspectRatio: 1, child: SizedBox()),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
        ],
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: full ? null : onCamera,
                icon: const Icon(Icons.photo_camera_outlined),
                label: Text(l.incTakePhoto),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: full ? null : onGallery,
                icon: const Icon(Icons.photo_library_outlined),
                label: Text(l.incChoosePhoto),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SeverityPicker extends StatelessWidget {
  const _SeverityPicker({required this.selected, required this.onSelected});

  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Row(
      children: [
        for (var i = 0; i < incidentSeverities.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: Builder(
              builder: (context) {
                final s = incidentSeverities[i];
                final on = s == selected;
                final c = toneColors(incidentSeverityTone(s));
                return Semantics(
                  button: true,
                  selected: on,
                  label: incidentSeverityLabel(l, s),
                  child: ExcludeSemantics(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AbgRadii.md),
                      onTap: () => onSelected(s),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 160),
                        height: 48,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: on ? c.bg : AbgColors.white,
                          borderRadius: BorderRadius.circular(AbgRadii.md),
                          border: Border.all(
                            color: on ? c.fg : AbgColors.border,
                            width: on ? 1.6 : 1,
                          ),
                        ),
                        child: Text(
                          incidentSeverityLabel(l, s),
                          style: AbgText.caption.copyWith(
                            color: on ? c.fg : AbgColors.ink,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}
