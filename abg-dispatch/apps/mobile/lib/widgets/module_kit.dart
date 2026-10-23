/// Pieces the appointment, audit and leave screens share: the navy hero, a
/// tone banner, a vertical progress stepper, the history card, the bottom
/// action bar, a note sheet and a directory person picker.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/formatting.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import 'common.dart';
import 'vocab.dart';

/// The navy intro strip at the top of a form.
class IntroBanner extends StatelessWidget {
  const IntroBanner({super.key, required this.icon, required this.text});

  final IconData icon;
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
            child: Icon(icon, color: AbgColors.navy),
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

/// The navy card that opens a detail screen.
class ModuleHero extends StatelessWidget {
  const ModuleHero({
    super.key,
    required this.chips,
    required this.title,
    this.lines = const [],
    this.footer,
  });

  final List<Widget> chips;
  final String title;
  final List<(IconData, String)> lines;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.xl),
        boxShadow: AbgShadows.raised,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: chips,
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: AbgText.h1.copyWith(color: Colors.white, fontSize: 22),
          ),
          const SizedBox(height: 10),
          for (final (icon, text) in lines)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 1),
                    child: Icon(icon, size: 16, color: AbgColors.platinumDeep),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      text,
                      style: AbgText.small.copyWith(color: AbgColors.platinum),
                    ),
                  ),
                ],
              ),
            ),
          if (footer != null) ...[const SizedBox(height: 14), footer!],
        ],
      ),
    );
  }
}

/// A tinted message: a warning, a clash, a "you are on leave today".
class ToneBanner extends StatelessWidget {
  const ToneBanner({
    super.key,
    required this.icon,
    required this.tone,
    required this.body,
    this.title,
    this.action,
  });

  final IconData icon;
  final Tone tone;
  final String? title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final c = toneColors(tone);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        border: Border.all(color: c.fg.withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: c.fg, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Text(
                    title!,
                    style: AbgText.bodyStrong.copyWith(
                      color: c.fg,
                      fontSize: 14,
                    ),
                  ),
                Text(body, style: AbgText.small.copyWith(color: c.fg)),
                if (action != null) ...[const SizedBox(height: 10), action!],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The latest word on a request: a reason, a proposal, a conclusion.
class QuoteCard extends StatelessWidget {
  const QuoteCard({super.key, required this.label, required this.text});

  final String label;
  final String text;

  @override
  Widget build(BuildContext context) => SectionCard(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.format_quote_rounded, color: AbgColors.navy500),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AbgText.caption),
              const SizedBox(height: 2),
              Text(
                text,
                style: AbgText.body.copyWith(fontStyle: FontStyle.italic),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// One step of a request's progress.
class StepItem {
  const StepItem({
    required this.label,
    required this.state,
    required this.icon,
    this.caption = '',
  });

  final String label;

  /// done · current · rejected · cancelled · upcoming · skipped
  final String state;
  final IconData icon;
  final String caption;
}

/// A vertical stepper: what is done, what is waiting and for whom.
class ProgressSteps extends StatelessWidget {
  const ProgressSteps({super.key, required this.title, required this.steps});

  final String title;
  final List<StepItem> steps;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AbgText.h3),
          const SizedBox(height: 14),
          for (var i = 0; i < steps.length; i++)
            _StepRow(
              step: steps[i],
              last: i == steps.length - 1,
              nextReached:
                  i < steps.length - 1 &&
                  !{'upcoming', 'skipped'}.contains(steps[i + 1].state),
            ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.step,
    required this.last,
    required this.nextReached,
  });

  final StepItem step;
  final bool last;
  final bool nextReached;

  @override
  Widget build(BuildContext context) {
    final s = step;
    final (Color bg, Color fg, Color border) = switch (s.state) {
      'done' => (AbgColors.navy, Colors.white, AbgColors.navy),
      'current' => (
        AbgColors.pendingSoft,
        AbgColors.pending,
        AbgColors.pending,
      ),
      'rejected' => (AbgColors.danger, Colors.white, AbgColors.danger),
      'cancelled' => (AbgColors.neutral, Colors.white, AbgColors.neutral),
      _ => (AbgColors.white, AbgColors.inkSubtle, AbgColors.borderStrong),
    };
    final icon = switch (s.state) {
      'current' => Icons.hourglass_top_rounded,
      'rejected' => Icons.close_rounded,
      'cancelled' => Icons.block_rounded,
      'done' => Icons.check_rounded,
      _ => s.icon,
    };
    final muted = s.state == 'upcoming' || s.state == 'skipped';
    return Semantics(
      label: '${s.label}. ${s.caption}',
      child: ExcludeSemantics(
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: 32,
                child: Column(
                  children: [
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: bg,
                        shape: BoxShape.circle,
                        border: Border.all(color: border, width: 2),
                      ),
                      child: Icon(icon, size: 16, color: fg),
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
                  padding: EdgeInsets.only(top: 4, bottom: last ? 0 : 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        s.label,
                        style: AbgText.bodyStrong.copyWith(
                          fontSize: 14,
                          color: muted
                              ? AbgColors.inkSubtle
                              : s.state == 'rejected'
                              ? AbgColors.danger
                              : AbgColors.navy,
                        ),
                      ),
                      if (s.caption.isNotEmpty)
                        Text(
                          s.caption,
                          style: AbgText.caption.copyWith(
                            color: s.state == 'current'
                                ? AbgColors.pending
                                : AbgColors.inkMuted,
                          ),
                        ),
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

/// One line of a request's history.
class HistoryEntry {
  const HistoryEntry({
    required this.icon,
    required this.color,
    required this.title,
    required this.actor,
    required this.at,
    this.note,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String actor;
  final DateTime at;
  final String? note;
}

/// Newest first.
class HistoryCard extends StatelessWidget {
  const HistoryCard({super.key, required this.entries});

  final List<HistoryEntry> entries;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    if (entries.isEmpty) {
      return SectionCard(child: Text(l.kitNoHistory, style: AbgText.small));
    }
    final items = entries.reversed.toList();
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
                  Icon(items[k].icon, size: 20, color: items[k].color),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          items[k].title,
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
}

/// A button in the bottom action bar.
class ActionSpec {
  const ActionSpec(
    this.label,
    this.icon,
    this.onPressed, {
    this.primary = false,
    this.danger = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final bool primary;
  final bool danger;
}

/// The white bar of buttons under a detail screen. Empty: nothing shown.
class BottomActions extends StatelessWidget {
  const BottomActions({super.key, required this.actions, this.busy = false});

  final List<ActionSpec> actions;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    if (actions.isEmpty) return const SizedBox.shrink();
    Widget button(ActionSpec a) {
      if (a.primary) {
        return FilledButton.icon(
          onPressed: busy ? null : a.onPressed,
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            backgroundColor: a.danger ? AbgColors.danger : null,
          ),
          icon: busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: Colors.white,
                  ),
                )
              : Icon(a.icon, size: 20),
          label: _FitLabel(a.label),
        );
      }
      return OutlinedButton.icon(
        onPressed: busy ? null : a.onPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          foregroundColor: a.danger ? AbgColors.danger : AbgColors.navy,
          side: BorderSide(
            color: a.danger
                ? AbgColors.danger.withValues(alpha: 0.5)
                : AbgColors.borderStrong,
          ),
        ),
        icon: Icon(a.icon, size: 20),
        label: _FitLabel(a.label),
      );
    }

    // Two buttons side by side; a third goes on its own row above.
    final rows = <List<ActionSpec>>[
      if (actions.length > 2) [actions.first],
      actions.length > 2 ? actions.sublist(1) : actions,
    ];
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: const BoxDecoration(
          color: AbgColors.white,
          border: Border(top: BorderSide(color: AbgColors.border)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var r = 0; r < rows.length; r++) ...[
              if (r > 0) const SizedBox(height: 10),
              Row(
                children: [
                  for (var i = 0; i < rows[r].length; i++) ...[
                    if (i > 0) const SizedBox(width: 10),
                    Expanded(child: button(rows[r][i])),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// A button label that shrinks a little rather than cut off a long word.
class _FitLabel extends StatelessWidget {
  const _FitLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) =>
      FittedBox(fit: BoxFit.scaleDown, child: Text(text, maxLines: 1));
}

/// The rounded sheet every module uses for its pop-up forms.
Future<T?> showAbgSheet<T>(BuildContext context, WidgetBuilder builder) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AbgColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AbgRadii.sheet),
        ),
      ),
      builder: builder,
    );

/// The title and hint at the top of a sheet (the theme draws the grab handle).
class SheetHeader extends StatelessWidget {
  const SheetHeader({super.key, required this.title, this.hint});

  final String title;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: AbgText.h2),
        if (hint != null) ...[
          const SizedBox(height: 4),
          Text(hint!, style: AbgText.small),
        ],
        const SizedBox(height: 18),
      ],
    );
  }
}

/// Asks for a note. Returns the text ('' when optional and left empty), or
/// null when the sheet is dismissed.
Future<String?> askNote(
  BuildContext context, {
  required String title,
  required String confirm,
  String? hint,
  bool required = false,
  bool danger = false,
  int minLength = 3,
  int maxLength = 1000,
  String? label,
}) => showAbgSheet<String>(
  context,
  (_) => _NoteSheet(
    title: title,
    hint: hint,
    confirm: confirm,
    required: required,
    danger: danger,
    minLength: minLength,
    maxLength: maxLength,
    label: label,
  ),
);

class _NoteSheet extends StatefulWidget {
  const _NoteSheet({
    required this.title,
    required this.confirm,
    required this.required,
    required this.danger,
    required this.minLength,
    required this.maxLength,
    this.hint,
    this.label,
  });

  final String title;
  final String? hint;
  final String confirm;
  final bool required;
  final bool danger;
  final int minLength;
  final int maxLength;
  final String? label;

  @override
  State<_NoteSheet> createState() => _NoteSheetState();
}

class _NoteSheetState extends State<_NoteSheet> {
  final _note = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _done() {
    final text = _note.text.trim();
    if (widget.required && text.length < widget.minLength) {
      setState(() => _error = L.of(context).kitReasonRequired);
      return;
    }
    Navigator.pop(context, text);
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
            SheetHeader(title: widget.title, hint: widget.hint),
            TextField(
              controller: _note,
              autofocus: widget.required,
              minLines: 3,
              maxLines: 5,
              maxLength: widget.maxLength,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) {
                if (_error != null) setState(() => _error = null);
              },
              decoration: InputDecoration(
                labelText:
                    widget.label ??
                    (widget.required ? l.kitReason : l.kitNoteOptional),
                errorText: _error,
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: _done,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: widget.danger
                    ? AbgColors.danger
                    : AbgColors.navy,
              ),
              child: Text(widget.confirm),
            ),
          ],
        ),
      ),
    );
  }
}

/// Someone chosen from the staff directory.
class PickedPerson {
  const PickedPerson({
    required this.employeeId,
    required this.name,
    this.userId,
    this.designation,
    this.department,
  });

  final String employeeId;

  /// Null when the person cannot sign in.
  final String? userId;
  final String name;
  final String? designation;
  final String? department;

  String get subtitle => [
    designation,
    department,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');
}

/// Search the staff directory. [needsAccount]: only people who can sign in
/// may be chosen (approvers, owners); a reliever needs no account.
Future<PickedPerson?> pickPerson(
  BuildContext context, {
  required String title,
  String? hint,
  bool needsAccount = true,
}) => showAbgSheet<PickedPerson>(
  context,
  (_) => _PersonPicker(title: title, hint: hint, needsAccount: needsAccount),
);

class _PersonPicker extends StatefulWidget {
  const _PersonPicker({
    required this.title,
    required this.needsAccount,
    this.hint,
  });

  final String title;
  final String? hint;
  final bool needsAccount;

  @override
  State<_PersonPicker> createState() => _PersonPickerState();
}

class _PersonPickerState extends State<_PersonPicker> {
  final _query = TextEditingController();
  Timer? _debounce;
  List<DirectoryEmployee> _results = [];
  bool _loading = false;
  bool _searched = false;

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
    if (q.trim().length < 2) {
      setState(() => (_results = [], _searched = false));
      return;
    }
    setState(() => _loading = true);
    try {
      final rows = await context.read<DispatchRepository>().employees(q.trim());
      if (mounted) {
        setState(() => _results = rows.where((e) => !e.isMe).toList());
      }
    } catch (_) {
      if (mounted) setState(() => _results = []);
    } finally {
      if (mounted) setState(() => (_loading = false, _searched = true));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.75,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
              child: SheetHeader(title: widget.title, hint: widget.hint),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: TextField(
                controller: _query,
                autofocus: true,
                onChanged: _changed,
                decoration: InputDecoration(
                  hintText: l.kitSearchPeople,
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
              ),
            ),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Expanded(
              child: _results.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        _searched ? l.kitNoMatches : l.kitTypeToSearch,
                        style: AbgText.small,
                        textAlign: TextAlign.center,
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                      itemCount: _results.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 2),
                      itemBuilder: (_, i) {
                        final e = _results[i];
                        final userId = e.raw['userId']?.toString();
                        final enabled = !widget.needsAccount || userId != null;
                        return ListTile(
                          enabled: enabled,
                          minTileHeight: kMinTap + 8,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AbgRadii.md),
                          ),
                          leading: Avatar(
                            initials: e.person.initials,
                            size: 38,
                          ),
                          title: Text(
                            e.name,
                            style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                          ),
                          subtitle: Text(
                            [e.designation, e.department, e.branch]
                                .whereType<String>()
                                .where((s) => s.isNotEmpty)
                                .join(' · '),
                            style: AbgText.caption,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: enabled
                              ? null
                              : Text(l.kitNoAccount, style: AbgText.caption),
                          onTap: () => Navigator.pop(
                            context,
                            PickedPerson(
                              employeeId: e.id,
                              userId: userId,
                              name: e.name,
                              designation: e.designation,
                              department: e.department,
                            ),
                          ),
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

/// A tappable row in a form that opens a picker.
class PickerTile extends StatelessWidget {
  const PickerTile({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.placeholder = false,
  });

  final IconData icon;
  final String label;
  final String? trailing;
  final VoidCallback? onTap;

  /// Nothing chosen yet: the label is a prompt.
  final bool placeholder;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AbgColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AbgRadii.md),
        side: const BorderSide(color: AbgColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AbgRadii.md),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Row(
              children: [
                Icon(icon, color: AbgColors.inkSubtle),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: AbgText.body.copyWith(
                      fontSize: 14.5,
                      color: placeholder ? AbgColors.inkMuted : AbgColors.ink,
                    ),
                  ),
                ),
                if (trailing != null)
                  Text(
                    trailing!,
                    style: AbgText.caption.copyWith(
                      color: AbgColors.navy500,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AbgColors.inkSubtle,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A person row in a form with a Change / Choose button.
class PersonField extends StatelessWidget {
  const PersonField({
    super.key,
    required this.label,
    required this.onChoose,
    this.name,
    this.subtitle,
    this.emptyText,
    this.onClear,
  });

  final String label;
  final String? name;
  final String? subtitle;
  final String? emptyText;
  final VoidCallback? onChoose;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final initials = (name ?? '?')
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty && p != 'Md.')
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
      child: Row(
        children: [
          name == null
              ? Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AbgColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(color: AbgColors.border),
                  ),
                  child: const Icon(
                    Icons.person_search_rounded,
                    color: AbgColors.inkSubtle,
                    size: 20,
                  ),
                )
              : Avatar(initials: initials.isEmpty ? '?' : initials, size: 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AbgText.caption),
                Text(
                  name ?? emptyText ?? '—',
                  style: AbgText.bodyStrong.copyWith(
                    fontSize: 14.5,
                    color: name == null ? AbgColors.inkMuted : AbgColors.ink,
                  ),
                ),
                if (subtitle != null && subtitle!.isNotEmpty)
                  Text(
                    subtitle!,
                    style: AbgText.caption,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          if (onClear != null && name != null)
            IconButton(
              tooltip: l.kitRemove,
              onPressed: onClear,
              icon: const Icon(Icons.close_rounded, size: 20),
            ),
          TextButton(
            onPressed: onChoose,
            style: TextButton.styleFrom(
              minimumSize: const Size(kMinTap, kMinTap),
            ),
            child: Text(name != null ? l.kitChange : l.kitChoose),
          ),
        ],
      ),
    );
  }
}

/// "My leave | To approve (3)": a segmented switch. Counts are optional.
class SegmentTabs extends StatelessWidget {
  const SegmentTabs({
    super.key,
    required this.tabs,
    required this.index,
    required this.onChanged,
  });

  final List<(String, int?)> tabs;
  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget tab(int i) {
      final (label, count) = tabs[i];
      final on = index == i;
      return Expanded(
        child: Semantics(
          selected: on,
          button: true,
          child: InkWell(
            borderRadius: BorderRadius.circular(AbgRadii.md),
            onTap: () => onChanged(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              height: kMinTap,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 6),
              decoration: BoxDecoration(
                color: on ? AbgColors.navy : Colors.transparent,
                borderRadius: BorderRadius.circular(AbgRadii.md),
                boxShadow: on ? AbgShadows.card : null,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(
                    child: Text(
                      label,
                      overflow: TextOverflow.ellipsis,
                      style: AbgText.bodyStrong.copyWith(
                        fontSize: 13.5,
                        color: on ? Colors.white : AbgColors.inkMuted,
                      ),
                    ),
                  ),
                  if (count != null && count > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: on ? Colors.white24 : AbgColors.pending,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '$count',
                        style: AbgText.caption.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AbgColors.white,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        border: Border.all(color: AbgColors.border),
      ),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            tab(i),
          ],
        ],
      ),
    );
  }
}

/// Filter chips in one wrapping row.
class FilterChips extends StatelessWidget {
  const FilterChips({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  final List<(String, String)> options;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final (value, label) in options)
        ChoiceChip(
          label: Text(label),
          selected: selected == value,
          onSelected: (_) => onSelected(value),
        ),
    ],
  );
}

/// Navy choice chips with an icon, as the tour form uses for purposes.
class IconChoiceChips<T> extends StatelessWidget {
  const IconChoiceChips({
    super.key,
    required this.values,
    required this.selected,
    required this.label,
    required this.onSelected,
    this.icon,
  });

  final List<T> values;
  final T? selected;
  final String Function(T) label;
  final IconData Function(T)? icon;
  final ValueChanged<T> onSelected;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final v in values)
        ChoiceChip(
          avatar: icon == null
              ? null
              : Icon(
                  icon!(v),
                  size: 18,
                  color: selected == v ? Colors.white : AbgColors.navy500,
                ),
          label: Text(label(v)),
          selected: selected == v,
          showCheckmark: false,
          selectedColor: AbgColors.navy,
          labelStyle: AbgText.small.copyWith(
            color: selected == v ? Colors.white : AbgColors.ink,
            fontWeight: FontWeight.w600,
          ),
          onSelected: (_) => onSelected(v),
        ),
    ],
  );
}

/// The submit bar under a form.
class SubmitBar extends StatelessWidget {
  const SubmitBar({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.icon = Icons.send_rounded,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: AbgColors.white,
        border: Border(top: BorderSide(color: AbgColors.border)),
      ),
      child: FilledButton.icon(
        onPressed: busy ? null : onPressed,
        icon: busy
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  color: Colors.white,
                ),
              )
            : Icon(icon),
        label: Text(label),
      ),
    ),
  );
}

// ── Shared parsing helpers for the module models ──

String? jStr(dynamic v) => v?.toString();
Map<String, dynamic> jMap(dynamic v) =>
    v is Map<String, dynamic> ? v : <String, dynamic>{};
List<Map<String, dynamic>> jList(dynamic v) => v is List
    ? v.whereType<Map<String, dynamic>>().toList()
    : <Map<String, dynamic>>[];
List<String> jStrings(dynamic v) =>
    v is List ? v.map((e) => e.toString()).toList() : <String>[];
DateTime? jInstant(dynamic v) =>
    v is String ? DateTime.tryParse(v)?.toLocal() : null;
double jNum(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
int jInt(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
