import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/module_kit.dart';
import 'audit_api.dart';
import 'audit_models.dart';
import 'audit_widgets.dart';

/// Record a finding on the spot: what, how serious, who fixes it and by
/// when. Pops with the updated audit.
class FindingFormScreen extends StatefulWidget {
  const FindingFormScreen({super.key, required this.audit});

  final AuditDetail audit;

  @override
  State<FindingFormScreen> createState() => _FindingFormScreenState();
}

class _FindingFormScreenState extends State<FindingFormScreen> {
  // One key per form: a retried submit never records the finding twice.
  final _idempotencyKey = const Uuid().v4();
  final _title = TextEditingController();
  final _detail = TextEditingController();
  final _clause = TextEditingController();
  final _area = TextEditingController();
  final _recommendation = TextEditingController();
  String _severity = 'MAJOR';
  PickedPerson? _owner;
  DateTime? _due;
  bool _busy = false;

  bool get _observation => _severity == 'OBSERVATION';

  DateTime get _defaultDue =>
      dhakaToday().add(Duration(days: findingDueDays[_severity] ?? 30));

  @override
  void initState() {
    super.initState();
    _title.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    for (final c in [_title, _detail, _clause, _area, _recommendation]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _problem(L l) {
    if (_title.text.trim().length < AuditLimits.findingTitleMin) {
      return l.audErrTitle;
    }
    if (!_observation && _owner?.userId == null) return l.audErrOwner;
    return null;
  }

  Future<void> _chooseOwner() async {
    final l = L.of(context);
    final picked = await pickPerson(
      context,
      title: l.audChooseOwner,
      hint: l.audOwnerHint,
    );
    if (picked != null && mounted) setState(() => _owner = picked);
  }

  Future<void> _pickDue() async {
    final today = dhakaToday();
    final first = DateTime(today.year, today.month, today.day);
    final current = _due ?? _defaultDue;
    final picked = await showDatePicker(
      context: context,
      firstDate: first,
      lastDate: first.add(const Duration(days: AuditLimits.maxDueDays)),
      initialDate: DateTime(current.year, current.month, current.day),
      helpText: L.of(context).audDueLabel,
    );
    if (picked != null && mounted) {
      setState(
        () => _due = DateTime.utc(picked.year, picked.month, picked.day),
      );
    }
  }

  Future<void> _submit() async {
    final l = L.of(context);
    final problem = _problem(l);
    if (problem != null) {
      showSnack(context, problem, error: true);
      return;
    }
    String? text(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    setState(() => _busy = true);
    try {
      final next = await AuditsApi(context.read<ApiClient>())
          .addFinding(widget.audit.id, {
            'title': _title.text.trim(),
            'severity': _severity,
            'detail': ?text(_detail),
            'clause': ?text(_clause),
            'area': ?text(_area),
            'recommendation': ?text(_recommendation),
            if (!_observation) 'ownerUserId': _owner!.userId,
            if (!_observation) 'dueDate': isoDay(_due ?? _defaultDue),
          }, _idempotencyKey);
      if (!mounted) return;
      showSnack(context, l.audDoneFinding);
      Navigator.pop(context, next);
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
      appBar: AppBar(title: Text(l.audFindingTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          8,
          AbgSpace.gutter,
          32,
        ),
        children: [
          IntroBanner(
            icon: auditTypeIcon(widget.audit.row.type),
            text:
                '${widget.audit.row.referenceNumber} · ${widget.audit.row.branchName}\n${widget.audit.row.title}',
          ),
          const SizedBox(height: 22),
          TextField(
            controller: _title,
            maxLength: AuditLimits.findingTitleMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: '${l.audFindingTitleLabel} *',
              hintText: l.audFindingTitleHint,
            ),
          ),
          const SizedBox(height: 4),
          SectionTitle(l.audSeverity),
          for (final s in findingSeverities)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _SeverityOption(
                severity: s,
                selected: _severity == s,
                onTap: () => setState(() => _severity = s),
              ),
            ),
          const SizedBox(height: 14),
          TextField(
            controller: _detail,
            minLines: 2,
            maxLines: 5,
            maxLength: AuditLimits.findingDetailMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l.audDetailLabel,
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _clause,
                  maxLength: AuditLimits.clauseMax,
                  decoration: InputDecoration(labelText: l.audClause),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _area,
                  maxLength: AuditLimits.clauseMax,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(labelText: l.audArea),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          TextField(
            controller: _recommendation,
            minLines: 2,
            maxLines: 4,
            maxLength: AuditLimits.findingDetailMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l.audRecommendationOptional,
              alignLabelWithHint: true,
            ),
          ),
          if (!_observation) ...[
            const SizedBox(height: 14),
            SectionTitle(l.audOwner),
            PersonField(
              label: l.audChooseOwner,
              name: _owner?.name,
              subtitle: _owner?.subtitle,
              emptyText: l.audNoOwner,
              onChoose: _busy ? null : _chooseOwner,
            ),
            const SizedBox(height: 10),
            PickerTile(
              icon: Icons.event_outlined,
              label:
                  '${l.audDueLabel}: ${tourDay(_due ?? _defaultDue, l.localeName)}',
              onTap: _busy ? null : _pickDue,
            ),
          ],
        ],
      ),
      bottomNavigationBar: SubmitBar(
        label: l.audSaveFinding,
        busy: _busy,
        icon: Icons.playlist_add_check_rounded,
        onPressed: _submit,
      ),
    );
  }
}

class _SeverityOption extends StatelessWidget {
  const _SeverityOption({
    required this.severity,
    required this.selected,
    required this.onTap,
  });

  final String severity;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
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
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                SeverityTag(severity),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    severityHint(l, severity),
                    style: AbgText.small.copyWith(
                      color: selected
                          ? AbgColors.platinumBright
                          : AbgColors.ink,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
