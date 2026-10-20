import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/api_client.dart';
import '../l10n/app_localizations.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import 'vocab.dart';

class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AbgSpace.lg),
    this.onTap,
    this.color,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      decoration: BoxDecoration(
        color: color ?? AbgColors.white,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        border: Border.all(color: AbgColors.border),
        boxShadow: AbgShadows.card,
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(AbgRadii.lg),
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
    return card;
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(
    this.title, {
    super.key,
    this.action,
    this.onAction,
    this.trailing,
  });

  final String title;
  final String? action;
  final VoidCallback? onAction;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AbgSpace.sm, top: AbgSpace.xs),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(title, style: AbgText.h3),
            ),
          ),
          ?trailing,
          if (action != null)
            TextButton(onPressed: onAction, child: Text(action!)),
        ],
      ),
    );
  }
}

class Overline extends StatelessWidget {
  const Overline(this.text, {super.key, this.color});
  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) =>
      Text(text.toUpperCase(), style: AbgText.overline.copyWith(color: color));
}

/// Label/value pair used in parcel detail cards.
class InfoRow extends StatelessWidget {
  const InfoRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.trailing,
    this.valueStyle,
  });

  final IconData icon;
  final String label;
  final String value;
  final Widget? trailing;
  final TextStyle? valueStyle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AbgColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AbgColors.border),
            ),
            child: Icon(icon, size: 18, color: AbgColors.navy500),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AbgText.caption),
                const SizedBox(height: 2),
                Text(
                  value,
                  style:
                      valueStyle ?? AbgText.bodyStrong.copyWith(fontSize: 14),
                ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

class Avatar extends StatelessWidget {
  const Avatar({
    super.key,
    required this.initials,
    this.size = 40,
    this.dark = false,
  });

  final String initials;
  final double size;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: dark
            ? AbgGradients.platinum
            : const LinearGradient(
                colors: [AbgColors.deepNavy, AbgColors.navy500],
              ),
        border: Border.all(
          color: dark ? Colors.white24 : Colors.white,
          width: 2,
        ),
      ),
      child: Text(
        initials,
        style: AbgText.h3.copyWith(
          fontSize: size * 0.36,
          color: dark ? AbgColors.navy : AbgColors.white,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

/// Small tone-coloured badge with icon and text (never colour alone).
class ToneBadge extends StatelessWidget {
  const ToneBadge({
    super.key,
    required this.label,
    required this.tone,
    this.icon,
    this.dense = false,
    this.onDark = false,
  });

  final String label;
  final Tone tone;
  final IconData? icon;
  final bool dense;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final c = toneColors(tone);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 8 : 10,
        vertical: dense ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: onDark ? Colors.white.withValues(alpha: 0.10) : c.bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: onDark
              ? Colors.white.withValues(alpha: 0.18)
              : c.fg.withValues(alpha: 0.18),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: dense ? 13 : 15,
              color: onDark ? AbgColors.platinumBright : c.fg,
            ),
            SizedBox(width: dense ? 4 : 6),
          ],
          Text(
            label,
            style: AbgText.caption.copyWith(
              color: onDark ? AbgColors.platinumBright : c.fg,
              fontWeight: FontWeight.w700,
              fontSize: dense ? 11 : 12,
            ),
          ),
        ],
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip(
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
    final l = L.of(context);
    return Semantics(
      label: 'Status: ${statusLabel(l, status)}',
      child: ExcludeSemantics(
        child: ToneBadge(
          label: statusLabel(l, status),
          tone: statusTone(status),
          icon: statusIcon(status),
          dense: dense,
          onDark: onDark,
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? message;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AbgColors.white,
              border: Border.all(color: AbgColors.border),
              boxShadow: AbgShadows.card,
            ),
            child: Icon(icon, color: AbgColors.navy500, size: 30),
          ),
          const SizedBox(height: 16),
          Text(title, style: AbgText.h3, textAlign: TextAlign.center),
          if (message != null) ...[
            const SizedBox(height: 6),
            Text(message!, style: AbgText.small, textAlign: TextAlign.center),
          ],
          if (action != null) ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: onAction,
              style: OutlinedButton.styleFrom(minimumSize: const Size(160, 46)),
              child: Text(action!),
            ),
          ],
        ],
      ),
    );
  }
}

/// Loading placeholder with a soft shimmer.
class Skeleton extends StatefulWidget {
  const Skeleton({
    super.key,
    this.height = 16,
    this.width = double.infinity,
    this.radius = 8,
  });

  final double height;
  final double width;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, _) => Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.radius),
          gradient: LinearGradient(
            begin: Alignment(-1.5 + _c.value * 3, 0),
            end: Alignment(-0.5 + _c.value * 3, 0),
            colors: const [
              AbgColors.softSilver,
              AbgColors.platinumBright,
              AbgColors.softSilver,
            ],
          ),
        ),
      ),
    );
  }
}

class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key});

  @override
  Widget build(BuildContext context) => const SectionCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Skeleton(width: 120, height: 12),
        SizedBox(height: 12),
        Skeleton(height: 18),
        SizedBox(height: 10),
        Skeleton(width: 200, height: 12),
      ],
    ),
  );
}

/// Maps an API failure to a sentence; never "Something went wrong" when we know better.
String errorText(BuildContext context, Object error) {
  final l = L.of(context);
  if (error is ApiException) {
    return error.isNetwork ? l.errorNetwork : error.message;
  }
  return l.errorGeneric;
}

void showSnack(
  BuildContext context,
  String message, {
  bool error = false,
  IconData? icon,
}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        backgroundColor: error ? AbgColors.danger : AbgColors.navy,
        content: Row(
          children: [
            Icon(
              icon ??
                  (error
                      ? Icons.error_outline_rounded
                      : Icons.check_circle_outline_rounded),
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
      ),
    );
}

class ErrorPanel extends StatelessWidget {
  const ErrorPanel({super.key, required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final e = error;
    final network = e is ApiException && e.isNetwork;
    return EmptyState(
      icon: network ? Icons.wifi_off_rounded : Icons.error_outline_rounded,
      title: network ? l.offline : l.errorGeneric,
      message: errorText(context, error),
      action: l.retry,
      onAction: onRetry,
    );
  }
}

/// Monospace-feeling tracking number that copies on tap.
class TrackingNumber extends StatelessWidget {
  const TrackingNumber(
    this.value, {
    super.key,
    this.onDark = false,
    this.size = 13,
  });

  final String value;
  final bool onDark;
  final double size;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(6),
      onTap: () {
        Clipboard.setData(ClipboardData(text: value));
        showSnack(
          context,
          L.of(context).trackingCopied,
          icon: Icons.copy_rounded,
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Text(
          value,
          style: AbgText.mono.copyWith(
            fontSize: size,
            color: onDark ? AbgColors.platinum : AbgColors.inkMuted,
          ),
        ),
      ),
    );
  }
}

Future<bool> confirmDialog(
  BuildContext context, {
  required String title,
  required String body,
  required String confirm,
  bool destructive = false,
}) async {
  final l = L.of(context);
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AbgColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AbgRadii.xl),
      ),
      title: Text(title, style: AbgText.h2),
      content: Text(
        body,
        style: AbgText.body.copyWith(color: AbgColors.inkMuted),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: Text(l.cancel),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            minimumSize: const Size(120, 48),
            backgroundColor: destructive ? AbgColors.danger : AbgColors.navy,
          ),
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirm),
        ),
      ],
    ),
  );
  return ok ?? false;
}
