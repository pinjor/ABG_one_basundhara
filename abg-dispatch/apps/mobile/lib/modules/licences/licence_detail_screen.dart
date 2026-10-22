import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import 'licence_models.dart';
import 'licence_widgets.dart';

/// Calendar dates are the same day everywhere: format them as they are.
String _day(DateTime? d, String locale) =>
    d == null ? '—' : DateFormat.yMMMd(locale).format(d);

/// One licence: how long it has left, where the renewal stands, the scanned
/// copy and everything that has happened to it. Read-only.
class LicenceDetailScreen extends StatefulWidget {
  const LicenceDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<LicenceDetailScreen> createState() => _LicenceDetailScreenState();
}

class _LicenceDetailScreenState extends State<LicenceDetailScreen> {
  late final LicenceApi _api = LicenceApi(context.read<ApiClient>());
  LicenceDetail? _licence;
  Object? _error;
  bool _opening = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final licence = await _api.get(widget.id);
      if (mounted) setState(() => (_licence = licence, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  /// Document links are signed for ten minutes, so fetch a fresh one first.
  Future<void> _openDocument() async {
    final l = L.of(context);
    setState(() => _opening = true);
    try {
      final fresh = await _api.get(widget.id);
      if (!mounted) return;
      setState(() => _licence = fresh);
      final url = fresh.documentUrl;
      if (url == null) return;
      if (fresh.documentIsPdf) {
        final ok = await launchUrl(
          Uri.parse(apiUrl(url)),
          mode: LaunchMode.externalApplication,
        );
        if (!ok && mounted) showSnack(context, l.licOpenFailed, error: true);
      } else {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            fullscreenDialog: true,
            builder: (_) =>
                _ScanViewer(url: apiUrl(url), title: fresh.row.name),
          ),
        );
      }
    } catch (_) {
      if (mounted) showSnack(context, l.licOpenFailed, error: true);
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final d = _licence;
    return Scaffold(
      appBar: AppBar(title: Text(d?.row.name ?? l.licTitle)),
      body: _error != null
          ? Padding(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              child: ErrorPanel(error: _error!, onRetry: _load),
            )
          : d == null
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
                  _Hero(licence: d),
                  if (!d.row.active) ...[
                    const SizedBox(height: 12),
                    _Notice(
                      icon: Icons.archive_outlined,
                      text: l.licRetiredNotice,
                    ),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.licRenewalProgress),
                  _RenewalSteps(licence: d),
                  const SizedBox(height: 22),
                  SectionTitle(l.licScan),
                  _Document(
                    licence: d,
                    opening: _opening,
                    onOpen: _openDocument,
                  ),
                  const SizedBox(height: 22),
                  SectionTitle(l.licDetails),
                  _Details(licence: d),
                  const SizedBox(height: 22),
                  SectionTitle(l.licHistory),
                  _History(events: d.history),
                  const SizedBox(height: 18),
                  Center(
                    child: Text(
                      l.licReadOnlyNote,
                      style: AbgText.caption,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.licence});
  final LicenceDetail licence;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = licence.row;
    final days = r.daysLeft;
    final tone = !r.active
        ? Tone.neutral
        : (days == 0 ? Tone.danger : licenceStateTone(r.state));
    final ringColour = switch (tone) {
      Tone.success => const Color(0xFF3CCB8A),
      Tone.pending => const Color(0xFFF2B84B),
      Tone.danger => const Color(0xFFFF7070),
      _ => AbgColors.platinumDeep,
    };
    final window = licence.renewalLeadDays < 30 ? 30 : licence.renewalLeadDays;
    final fraction = r.state == 'EXPIRED'
        ? 1.0
        : (days / window).clamp(0.02, 1.0).toDouble();
    final big = days == 0 ? l.licToday : '${days.abs()}';
    final caption = days == 0
        ? l.licCaptionToday
        : days < 0
        ? l.licCaptionOverdue(-days)
        : l.licCaptionLeft(days);
    return Container(
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.xl),
        boxShadow: AbgShadows.raised,
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Overline(
                      licenceCategoryLabel(l, r.category),
                      color: AbgColors.platinumDeep,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      r.name,
                      style: AbgText.h2.copyWith(color: AbgColors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      r.licenceNumber,
                      style: AbgText.mono.copyWith(color: AbgColors.platinum),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${r.branchName} · ${r.issuingAuthority}',
                      style: AbgText.small.copyWith(
                        color: AbgColors.platinumDeep,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Semantics(
                label: r.active ? licenceCountdownLabel(l, days) : l.licRetired,
                child: ExcludeSemantics(
                  child: SizedBox(
                    width: 104,
                    height: 104,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox.expand(
                          child: CircularProgressIndicator(
                            value: fraction,
                            strokeWidth: 8,
                            strokeCap: StrokeCap.round,
                            color: ringColour,
                            backgroundColor: Colors.white.withValues(
                              alpha: 0.12,
                            ),
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              big,
                              style: AbgText.h1.copyWith(
                                color: AbgColors.white,
                                fontSize: big.length > 3 ? 20 : 26,
                                fontFeatures: const [
                                  FontFeature.tabularFigures(),
                                ],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                              ),
                              child: Text(
                                caption,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                style: AbgText.caption.copyWith(
                                  color: AbgColors.platinumDeep,
                                  fontSize: 10.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              LicenceCountdownBadge(
                daysLeft: days,
                state: r.state,
                active: r.active,
              ),
              Text(
                '${days < 0 ? l.licExpiredOn : l.licExpiresOn} ${_day(r.expiresAt, l.localeName)}',
                style: AbgText.caption.copyWith(color: AbgColors.platinum),
              ),
            ],
          ),
          const SizedBox(height: 16),
          RenewalProgressBar(
            stage: r.renewalStage,
            progress: r.renewalProgress,
            onDark: true,
          ),
          if (r.active) ...[
            const SizedBox(height: 12),
            Text(
              licence.nextAlertOn == null
                  ? l.licAllAlertsSent
                  : l.licNextAlert(_day(licence.nextAlertOn, l.localeName)),
              style: AbgText.caption.copyWith(color: AbgColors.platinumDeep),
            ),
          ],
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AbgColors.neutralSoft,
      borderRadius: BorderRadius.circular(AbgRadii.lg),
      border: Border.all(color: AbgColors.border),
    ),
    child: Row(
      children: [
        Icon(icon, color: AbgColors.neutral),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: AbgText.small)),
      ],
    ),
  );
}

/// Documents prepared → Application submitted → Inspection scheduled → Fee paid → Renewed.
class _RenewalSteps extends StatelessWidget {
  const _RenewalSteps({required this.licence});
  final LicenceDetail licence;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final reached = licenceRenewalStages.indexOf(licence.row.renewalStage);
    final steps = licenceRenewalStages.sublist(1);
    final opens = licence.renewalWindowOpensOn;
    final today = DateTime.now().toUtc();
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < steps.length; i++)
            _StepRow(
              label: renewalStageLabel(l, steps[i]),
              done: i < reached,
              current: i == reached,
              last: i == steps.length - 1,
              nextLabel: l.licNextStep,
            ),
          const SizedBox(height: 6),
          Text(
            reached > 0 && licence.renewalStartedAt != null
                ? l.licStartedOn(
                    fullStamp(licence.renewalStartedAt!, l.localeName),
                  )
                : opens != null && !opens.isAfter(today)
                ? l.licWindowOpenHint(_day(opens, l.localeName))
                : l.licNotStartedHint(_day(opens, l.localeName)),
            style: AbgText.small,
          ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.label,
    required this.done,
    required this.current,
    required this.last,
    required this.nextLabel,
  });

  final String label;
  final bool done;
  final bool current;
  final bool last;
  final String nextLabel;

  @override
  Widget build(BuildContext context) {
    final colour = done
        ? (last ? AbgColors.success : AbgColors.navy)
        : AbgColors.white;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: colour,
                  border: Border.all(
                    color: done
                        ? Colors.transparent
                        : (current ? AbgColors.navy : AbgColors.borderStrong),
                    width: 2,
                  ),
                ),
                child: Icon(
                  done ? Icons.check_rounded : Icons.circle,
                  size: done ? 16 : 7,
                  color: done
                      ? Colors.white
                      : (current ? AbgColors.navy : AbgColors.borderStrong),
                ),
              ),
              if (!last)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: done ? AbgColors.navy : AbgColors.softSilver,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: 4, bottom: last ? 4 : 14),
              child: Row(
                children: [
                  Flexible(
                    child: Text(
                      label,
                      style: AbgText.bodyStrong.copyWith(
                        fontSize: 14,
                        color: done || current
                            ? AbgColors.navy
                            : AbgColors.inkSubtle,
                      ),
                    ),
                  ),
                  if (current) ...[
                    const SizedBox(width: 8),
                    ToneBadge(label: nextLabel, tone: Tone.active, dense: true),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Document extends StatelessWidget {
  const _Document({
    required this.licence,
    required this.opening,
    required this.onOpen,
  });

  final LicenceDetail licence;
  final bool opening;
  final VoidCallback onOpen;

  String _size(int? bytes) {
    if (bytes == null) return '';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).round()} KB';
    return '${(bytes / 1024 / 1024).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    if (licence.documentUrl == null) {
      return SectionCard(
        child: Row(
          children: [
            const Icon(Icons.description_outlined, color: AbgColors.inkSubtle),
            const SizedBox(width: 10),
            Expanded(child: Text(l.licNoScan, style: AbgText.small)),
          ],
        ),
      );
    }
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AbgColors.platinumBright,
                  borderRadius: BorderRadius.circular(AbgRadii.md),
                ),
                child: Icon(
                  licence.documentIsPdf
                      ? Icons.picture_as_pdf_outlined
                      : Icons.image_outlined,
                  color: AbgColors.navy500,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      licence.documentName ?? l.licScan,
                      style: AbgText.bodyStrong.copyWith(fontSize: 14),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${licence.documentIsPdf ? l.licPdf : l.licImage} · ${_size(licence.documentSize)}',
                      style: AbgText.caption,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(kMinTap),
              ),
              onPressed: opening ? null : onOpen,
              icon: opening
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Icon(
                      licence.documentIsPdf
                          ? Icons.open_in_new_rounded
                          : Icons.zoom_in_rounded,
                    ),
              label: Text(l.licViewScan),
            ),
          ),
        ],
      ),
    );
  }
}

class _Details extends StatelessWidget {
  const _Details({required this.licence});
  final LicenceDetail licence;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = licence.row;
    final fee = licence.renewalFee;
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InfoRow(
            icon: Icons.tag_rounded,
            label: l.licNumber,
            value: r.licenceNumber,
          ),
          InfoRow(
            icon: licenceCategoryIcon(r.category),
            label: l.licKind,
            value: licenceCategoryLabel(l, r.category),
          ),
          InfoRow(
            icon: Icons.account_balance_outlined,
            label: l.licAuthority,
            value: r.issuingAuthority,
          ),
          InfoRow(
            icon: Icons.apartment_rounded,
            label: l.licOffice,
            value: '${r.branchName} (${r.branchCode})',
          ),
          InfoRow(
            icon: Icons.person_outline_rounded,
            label: l.licOwner,
            value: r.ownerName == null
                ? l.licNoOwner
                : [
                    r.ownerName!,
                    licence.ownerDesignation,
                  ].whereType<String>().join(' · '),
          ),
          InfoRow(
            icon: Icons.event_outlined,
            label: l.licIssuedOn,
            value: _day(licence.issuedAt, l.localeName),
          ),
          InfoRow(
            icon: Icons.event_busy_outlined,
            label: r.daysLeft < 0 ? l.licExpiredOn : l.licExpiresOn,
            value: _day(r.expiresAt, l.localeName),
          ),
          InfoRow(
            icon: Icons.update_rounded,
            label: l.licWindow,
            value: l.licWindowValue(licence.renewalLeadDays),
          ),
          if (fee != null)
            InfoRow(
              icon: Icons.payments_outlined,
              label: l.licFee,
              value: l.licFeeValue(NumberFormat('#,##,##0', 'en').format(fee)),
            ),
          if (licence.notes != null && licence.notes!.isNotEmpty)
            InfoRow(
              icon: Icons.sticky_note_2_outlined,
              label: l.licNotes,
              value: licence.notes!,
              valueStyle: AbgText.small.copyWith(color: AbgColors.ink),
            ),
        ],
      ),
    );
  }
}

class _History extends StatelessWidget {
  const _History({required this.events});
  final List<LicenceEventItem> events;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final items = events.reversed.toList();
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
                  Icon(_icon(items[k]), size: 20, color: _colour(items[k])),
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
                        if (_extra(l, items[k]) case final extra?) ...[
                          const SizedBox(height: 2),
                          Text(extra, style: AbgText.caption),
                        ],
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

  String _label(L l, LicenceEventItem e) {
    final m = e.metadata;
    switch (e.type) {
      case 'CREATED':
        return l.licEvCreated;
      case 'DETAILS_CHANGED':
        final active = (m['changes'] as Map?)?['active'];
        if (active is Map) {
          return active['after'] == true ? l.licEvRestored : l.licEvRetired;
        }
        return l.licEvDetails;
      case 'RENEWAL_STAGE_CHANGED':
        final stage = renewalStageLabel(l, '${m['to']}');
        return m['direction'] == 'BACK'
            ? l.licEvStageBack(stage)
            : l.licEvStage(stage);
      case 'RENEWED':
        return l.licEvRenewed(_day(parseDay(m['newExpiresAt']), l.localeName));
      case 'DOCUMENT_UPLOADED':
        return l.licEvDocument;
      case 'ESCALATED':
        final days = (m['thresholdDays'] as num?)?.toInt() ?? 0;
        return days == 0 ? l.licEvAlertDay : l.licEvAlert(days);
      case 'NOTE_ADDED':
        return l.licEvNote;
      default:
        return e.type;
    }
  }

  String? _extra(L l, LicenceEventItem e) {
    if (e.type != 'ESCALATED') return null;
    final names = (e.metadata['notified'] as List?)?.cast<Object>() ?? const [];
    return names.isEmpty ? null : l.licEvNotified(names.join(', '));
  }

  IconData _icon(LicenceEventItem e) => switch (e.type) {
    'CREATED' => Icons.add_circle_outline_rounded,
    'DETAILS_CHANGED' => Icons.edit_note_rounded,
    'RENEWAL_STAGE_CHANGED' =>
      e.metadata['direction'] == 'BACK'
          ? Icons.undo_rounded
          : Icons.arrow_forward_rounded,
    'RENEWED' => Icons.verified_rounded,
    'DOCUMENT_UPLOADED' => Icons.upload_file_rounded,
    'ESCALATED' => Icons.notifications_active_outlined,
    _ => Icons.chat_bubble_outline_rounded,
  };

  Color _colour(LicenceEventItem e) {
    if (e.type == 'RENEWED') return AbgColors.success;
    if (e.type == 'ESCALATED') {
      final days = (e.metadata['thresholdDays'] as num?)?.toInt() ?? 90;
      return days <= 7
          ? AbgColors.danger
          : (days <= 30 ? AbgColors.pending : AbgColors.active);
    }
    return AbgColors.navy500;
  }
}

/// Full-screen, zoomable view of a scanned image.
class _ScanViewer extends StatelessWidget {
  const _ScanViewer({required this.url, required this.title});

  final String url;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(title, style: AbgText.h3.copyWith(color: Colors.white)),
      ),
      body: InteractiveViewer(
        maxScale: 5,
        child: Center(
          child: Image.network(
            url,
            fit: BoxFit.contain,
            loadingBuilder: (_, child, progress) => progress == null
                ? child
                : const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
            errorBuilder: (_, _, _) => Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                L.of(context).licOpenFailed,
                textAlign: TextAlign.center,
                style: AbgText.body.copyWith(color: Colors.white),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
