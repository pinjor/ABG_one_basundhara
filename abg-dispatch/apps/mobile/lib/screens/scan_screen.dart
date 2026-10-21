import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../core/gate_pass.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Scan the parcel's QR label (or type its tracking ID) to open it with the
/// next custody action ready. Scanning the physical label is also proof of
/// possession for QR receipt and on-behalf receipt.
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  bool _resolving = false;
  bool _cameraFailed = false;

  @override
  void dispose() {
    unawaited(_controller.dispose());
    super.dispose();
  }

  Future<void> _resolve(String payload) async {
    if (_resolving) return;
    // Visitor and pool-car gate passes open their own verification screens.
    final pass = extractGatePass(payload);
    if (pass != null) {
      _resolving = true;
      context.pushReplacement(pass.route);
      return;
    }
    setState(() => _resolving = true);
    try {
      final res = await context.read<DispatchRepository>().scan(payload);
      if (!mounted) return;
      context.pushReplacement(
        '/parcels/${res.parcel.id}',
        extra: res.scannedLabel ? payload : null,
      );
    } catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
      await Future<void>.delayed(const Duration(seconds: 2));
      if (mounted) setState(() => _resolving = false);
    }
  }

  Future<void> _manual() async {
    final l = L.of(context);
    final controller = TextEditingController(text: 'ABG-');
    final value = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
          22,
          0,
          22,
          22 + MediaQuery.of(ctx).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l.enterManually, style: AbgText.h2),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              autofocus: true,
              textCapitalization: TextCapitalization.characters,
              style: AbgText.mono.copyWith(fontSize: 17),
              decoration: InputDecoration(
                labelText: l.trackingIdLabel,
                hintText: 'ABG-261020-HO-00428',
                prefixIcon: const Icon(Icons.confirmation_number_outlined),
              ),
              onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, controller.text.trim()),
              child: Text(l.lookUp),
            ),
          ],
        ),
      ),
    );
    if (value != null && value.length > 4) await _resolve(value);
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (!_cameraFailed)
            MobileScanner(
              controller: _controller,
              onDetect: (capture) {
                final code = capture.barcodes
                    .map((b) => b.rawValue)
                    .whereType<String>()
                    .firstOrNull;
                if (code != null) unawaited(_resolve(code));
              },
              errorBuilder: (context, error) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && !_cameraFailed) {
                    setState(() => _cameraFailed = true);
                  }
                });
                return const ColoredBox(color: AbgColors.midnight);
              },
            )
          else
            const ColoredBox(color: AbgColors.midnight),
          const _Viewfinder(),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
                  child: Row(
                    children: [
                      IconButton(
                        tooltip: l.close,
                        onPressed: () => context.pop(),
                        icon: const Icon(
                          Icons.close_rounded,
                          color: Colors.white,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          l.scanTitle,
                          textAlign: TextAlign.center,
                          style: AbgText.h3.copyWith(color: Colors.white),
                        ),
                      ),
                      IconButton(
                        tooltip: l.torch,
                        onPressed: _cameraFailed
                            ? null
                            : () => _controller.toggleTorch(),
                        icon: const Icon(
                          Icons.flashlight_on_outlined,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                if (_resolving)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: CircularProgressIndicator(color: AbgColors.platinum),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    _cameraFailed ? l.cameraUnavailable : l.scanHint,
                    textAlign: TextAlign.center,
                    style: AbgText.body.copyWith(
                      color: AbgColors.platinumBright,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white38),
                      backgroundColor: Colors.white.withValues(alpha: 0.08),
                    ),
                    onPressed: _manual,
                    icon: const Icon(Icons.keyboard_alt_outlined),
                    label: Text(l.enterManually),
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

class _Viewfinder extends StatelessWidget {
  const _Viewfinder();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: LayoutBuilder(
        builder: (context, c) {
          final size = (c.maxWidth * 0.68).clamp(200.0, 320.0);
          return CustomPaint(
            size: Size(c.maxWidth, c.maxHeight),
            painter: _FinderPainter(size),
          );
        },
      ),
    );
  }
}

class _FinderPainter extends CustomPainter {
  _FinderPainter(this.box);
  final double box;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height * 0.44),
      width: box,
      height: box,
    );
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(26));
    final shade = Path()
      ..addRect(Offset.zero & size)
      ..addRRect(rrect)
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(shade, Paint()..color = const Color(0xB3071225));
    final corner = Paint()
      ..shader = AbgGradients.platinum.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    const len = 34.0;
    final r = rect;
    for (final (o, dx, dy) in [
      (r.topLeft, 1.0, 1.0),
      (r.topRight, -1.0, 1.0),
      (r.bottomLeft, 1.0, -1.0),
      (r.bottomRight, -1.0, -1.0),
    ]) {
      final p = Path()
        ..moveTo(o.dx, o.dy + dy * len)
        ..lineTo(o.dx, o.dy + dy * 12)
        ..quadraticBezierTo(o.dx, o.dy, o.dx + dx * 12, o.dy)
        ..lineTo(o.dx + dx * len, o.dy);
      canvas.drawPath(p, corner);
    }
  }

  @override
  bool shouldRepaint(covariant _FinderPainter old) => old.box != box;
}
