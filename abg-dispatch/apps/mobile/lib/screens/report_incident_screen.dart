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

/// "See something, say something" in two steps: pick one of the four groups,
/// then the exact problem, a photo or three, where it is and how severe —
/// and send. Confidential reports go to Head Office only.
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
  final _scroll = ScrollController();
  final _photos = <_Picked>[];
  String? _group;
  String? _category;
  String _severity = 'MEDIUM';
  bool _confidential = false;
  bool _anonymous = false;
  bool _busy = false;
  String? _branchId;
  String? _locationId;
  List<Option> _branches = [];
  List<Option> _locations = [];

  bool get _forcedConfidential =>
      _category != null && incidentForcesConfidential(_category!);

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
    _scroll.dispose();
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

  void _chooseGroup(String? group) {
    setState(() {
      _group = group;
      if (group == null ||
          !incidentGroupCategories[group]!.contains(_category)) {
        _category = null;
      }
    });
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  void _chooseCategory(String category) {
    setState(() {
      // Misconduct is the classic whistle-blowing case: always confidential, start anonymous.
      if (incidentForcesConfidential(category) && _category != category) {
        _anonymous = true;
      }
      _category = category;
    });
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

  void _preview(int index) {
    unawaited(
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (_) => _PhotoPreview(photos: _photos, initial: index),
        ),
      ),
    );
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
          'group': _group!,
          'category': _category!,
          'severity': _severity,
          'branchId': ?_branchId,
          'locationId': ?_locationId,
          if (_spot.text.trim().isNotEmpty) 'locationDetail': _spot.text.trim(),
          'anonymous': '$_anonymous',
          'confidential': '${_confidential || _forcedConfidential}',
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
    final group = _group;
    return PopScope(
      // Back from step 2 returns to the group tiles, keeping what was typed.
      canPop: group == null || _busy,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _chooseGroup(null);
      },
      child: Scaffold(
        appBar: AppBar(title: Text(l.incReport)),
        body: ListView(
          controller: _scroll,
          padding: const EdgeInsets.fromLTRB(
            AbgSpace.gutter,
            8,
            AbgSpace.gutter,
            32,
          ),
          children: group == null ? _stepOne(l) : _stepTwo(l, group),
        ),
        bottomNavigationBar: group == null
            ? null
            : SafeArea(
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
      ),
    );
  }

  List<Widget> _stepOne(L l) => [
    _Intro(text: l.incReportHint),
    const SizedBox(height: 22),
    _StepHeader(
      step: 1,
      title: l.incChooseGroup,
      subtitle: l.incChooseGroupHint,
    ),
    const SizedBox(height: 14),
    _GroupGrid(onSelected: _chooseGroup),
  ];

  List<Widget> _stepTwo(L l, String group) {
    final forced = _forcedConfidential;
    return [
      _StepHeader(step: 2, title: l.incChooseCategory),
      const SizedBox(height: 12),
      _ChosenGroup(group: group, onChange: () => _chooseGroup(null)),
      const SizedBox(height: 14),
      _CategoryChips(
        categories: incidentGroupCategories[group]!,
        selected: _category,
        onSelected: _chooseCategory,
      ),
      AnimatedSwitcher(
        duration: const Duration(milliseconds: 180),
        child: _category == null
            ? const SizedBox(height: 4)
            : Padding(
                key: ValueKey(_category),
                padding: const EdgeInsets.only(top: 10),
                child: _Note(
                  icon: incidentCategoryIcon(_category!),
                  text: incidentCategoryHint(l, _category!),
                ),
              ),
      ),
      if (forced) ...[
        const SizedBox(height: 8),
        _Note(
          icon: Icons.lock_outline_rounded,
          text: l.incConfidentialForced,
          strong: true,
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
      Row(
        children: [
          Expanded(child: SectionTitle(l.incPhotos)),
          Text(
            l.incPhotoCount(_photos.length, maxIncidentPhotos),
            style: AbgText.caption,
          ),
        ],
      ),
      Text(l.incPhotosHint, style: AbgText.small),
      const SizedBox(height: 12),
      _PhotoStrip(
        photos: _photos,
        onRemove: (i) => setState(() => _photos.removeAt(i)),
        onOpen: _preview,
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
      SectionTitle(l.incSeverity),
      _SeverityPicker(
        selected: _severity,
        onSelected: (s) => setState(() => _severity = s),
      ),
      const SizedBox(height: 8),
      Text(
        incidentSeverityHint(l, _severity),
        style: AbgText.small.copyWith(
          color: toneColors(incidentSeverityTone(_severity)).fg,
          fontWeight: FontWeight.w600,
        ),
      ),
      const SizedBox(height: 22),
      SectionTitle(l.incPrivacy),
      SectionCard(
        padding: const EdgeInsets.fromLTRB(16, 4, 8, 4),
        child: Column(
          children: [
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _confidential || forced,
              onChanged: forced || _busy
                  ? null
                  : (v) => setState(() => _confidential = v),
              secondary: const Icon(
                Icons.lock_outline_rounded,
                color: AbgColors.navy500,
              ),
              title: Text(
                l.incConfidential,
                style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
              ),
              subtitle: Text(
                forced ? l.incConfidentialForced : l.incConfidentialHint,
                style: AbgText.caption,
              ),
            ),
            const Divider(height: 1),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _anonymous,
              onChanged: _busy ? null : (v) => setState(() => _anonymous = v),
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
          ],
        ),
      ),
    ];
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

class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.step, required this.title, this.subtitle});
  final int step;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            for (var k = 1; k <= 2; k++) ...[
              if (k > 1) const SizedBox(width: 6),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: k == step ? 28 : 14,
                height: 5,
                decoration: BoxDecoration(
                  color: k <= step ? AbgColors.navy : AbgColors.softSilver,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ],
            const SizedBox(width: 10),
            Text(
              l.incStepOf(step, 2),
              style: AbgText.caption.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Text(title, style: AbgText.h2),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(subtitle!, style: AbgText.small),
        ],
      ],
    );
  }
}

/// The four groups as large tiles, two by two.
class _GroupGrid extends StatelessWidget {
  const _GroupGrid({required this.onSelected});
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    // Plain rows rather than a GridView: a nested scrollable would swallow
    // mouse-wheel scrolling on web and desktop.
    return Column(
      children: [
        for (var r = 0; r < incidentGroups.length; r += 2) ...[
          if (r > 0) const SizedBox(height: 10),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var c = r; c < r + 2; c++) ...[
                  if (c > r) const SizedBox(width: 10),
                  Expanded(
                    child: _GroupTile(
                      group: incidentGroups[c],
                      onTap: () => onSelected(incidentGroups[c]),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _GroupTile extends StatelessWidget {
  const _GroupTile({required this.group, required this.onTap});
  final String group;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final label = incidentGroupLabel(l, group);
    final hint = incidentGroupHint(l, group);
    return Semantics(
      button: true,
      label: '$label. $hint',
      child: ExcludeSemantics(
        child: Material(
          color: AbgColors.white,
          borderRadius: BorderRadius.circular(AbgRadii.lg),
          child: InkWell(
            borderRadius: BorderRadius.circular(AbgRadii.lg),
            onTap: onTap,
            child: Container(
              constraints: const BoxConstraints(minHeight: 148),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AbgRadii.lg),
                border: Border.all(color: AbgColors.border),
                boxShadow: AbgShadows.card,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: AbgGradients.hero,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      incidentGroupIcon(group),
                      color: AbgColors.platinumBright,
                      size: 23,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(label, style: AbgText.h3.copyWith(fontSize: 15)),
                  const SizedBox(height: 4),
                  Text(
                    hint,
                    style: AbgText.caption.copyWith(height: 1.3),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
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

class _ChosenGroup extends StatelessWidget {
  const _ChosenGroup({required this.group, required this.onChange});
  final String group;
  final VoidCallback onChange;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.md),
      ),
      child: Row(
        children: [
          Icon(incidentGroupIcon(group), color: AbgColors.platinumBright),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              incidentGroupLabel(l, group),
              style: AbgText.bodyStrong.copyWith(color: Colors.white),
            ),
          ),
          TextButton.icon(
            onPressed: onChange,
            style: TextButton.styleFrom(
              foregroundColor: AbgColors.platinumBright,
              minimumSize: const Size(48, 48),
            ),
            icon: const Icon(Icons.swap_horiz_rounded, size: 18),
            label: Text(l.incChangeGroup),
          ),
        ],
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.categories,
    required this.selected,
    required this.onSelected,
  });

  final List<String> categories;
  final String? selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final c in categories)
          ChoiceChip(
            showCheckmark: false,
            selected: selected == c,
            onSelected: (_) => onSelected(c),
            avatar: Icon(
              incidentCategoryIcon(c),
              size: 18,
              color: selected == c ? Colors.white : AbgColors.navy500,
            ),
            label: Text(incidentCategoryLabel(l, c)),
            labelStyle: AbgText.small.copyWith(
              color: selected == c ? Colors.white : AbgColors.ink,
              fontWeight: FontWeight.w600,
            ),
            selectedColor: AbgColors.navy,
            backgroundColor: AbgColors.white,
            side: BorderSide(
              color: selected == c ? AbgColors.navy : AbgColors.border,
            ),
            tooltip: incidentCategoryHint(l, c),
          ),
      ],
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.text, this.strong = false});
  final IconData icon;
  final String text;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: strong ? AbgColors.navy : AbgColors.activeSoft,
        borderRadius: BorderRadius.circular(AbgRadii.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 20,
            color: strong ? AbgColors.platinumBright : AbgColors.active,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: AbgText.small.copyWith(
                color: strong ? Colors.white : AbgColors.navy,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PhotoStrip extends StatelessWidget {
  const _PhotoStrip({
    required this.photos,
    required this.onRemove,
    required this.onOpen,
    required this.onCamera,
    required this.onGallery,
  });

  final List<_Picked> photos;
  final ValueChanged<int> onRemove;
  final ValueChanged<int> onOpen;
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
              for (var i = 0; i < maxIncidentPhotos; i++) ...[
                if (i > 0) const SizedBox(width: 10),
                Expanded(
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: i < photos.length
                        ? Stack(
                            fit: StackFit.expand,
                            children: [
                              Semantics(
                                button: true,
                                label: l.incPhotoPreview(i + 1),
                                child: GestureDetector(
                                  onTap: () => onOpen(i),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(
                                      AbgRadii.md,
                                    ),
                                    child: Image.memory(
                                      photos[i].bytes,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                left: 6,
                                bottom: 6,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AbgColors.navy.withValues(
                                      alpha: 0.75,
                                    ),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '${i + 1}',
                                    style: AbgText.caption.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 4,
                                right: 4,
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
                          )
                        : DecoratedBox(
                            decoration: BoxDecoration(
                              color: AbgColors.surface,
                              borderRadius: BorderRadius.circular(AbgRadii.md),
                              border: Border.all(color: AbgColors.border),
                            ),
                            child: const Icon(
                              Icons.add_photo_alternate_outlined,
                              color: AbgColors.borderStrong,
                            ),
                          ),
                  ),
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

class _PhotoPreview extends StatelessWidget {
  const _PhotoPreview({required this.photos, required this.initial});
  final List<_Picked> photos;
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
            child: Image.memory(photos[k].bytes, fit: BoxFit.contain),
          ),
        ),
      ),
    );
  }
}

/// Critical · High · Medium · Low, each with its tone, icon and label.
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
                  label:
                      '${incidentSeverityLabel(l, s)}. ${incidentSeverityHint(l, s)}',
                  child: ExcludeSemantics(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AbgRadii.md),
                      onTap: () => onSelected(s),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 160),
                        height: 64,
                        decoration: BoxDecoration(
                          color: on ? c.bg : AbgColors.white,
                          borderRadius: BorderRadius.circular(AbgRadii.md),
                          border: Border.all(
                            color: on ? c.fg : AbgColors.border,
                            width: on ? 1.6 : 1,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              incidentSeverityIcon(s),
                              size: 20,
                              color: on ? c.fg : AbgColors.inkSubtle,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              incidentSeverityLabel(l, s),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AbgText.caption.copyWith(
                                color: on ? c.fg : AbgColors.ink,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
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
