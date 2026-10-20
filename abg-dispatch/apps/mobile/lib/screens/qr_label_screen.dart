import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';

/// The label stuck on the envelope. It encodes only an opaque token — no
/// names, phone numbers or document titles — so a lost envelope leaks nothing.
class QrLabelCard extends StatelessWidget {
  const QrLabelCard({super.key, required this.parcel, this.large = false});

  final ParcelDetail parcel;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Container(
      decoration: BoxDecoration(
        color: AbgColors.white,
        borderRadius: BorderRadius.circular(AbgRadii.xl),
        border: Border.all(color: AbgColors.border),
        boxShadow: AbgShadows.raised,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          HeroBackground(
            showArcs: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Row(
                children: [
                  const AbgLogo(width: 58, markOnly: true),
                  const SizedBox(width: 10),
                  const DispatchWordmark(size: 10),
                  const Spacer(),
                  Text(
                    classificationShort(parcel.classification),
                    style: AbgText.overline.copyWith(color: AbgColors.platinum),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(large ? 26 : 20),
            child: Column(
              children: [
                Semantics(
                  label: 'QR code for ${parcel.trackingNumber}',
                  child: QrImageView(
                    data: parcel.qrPayload!,
                    version: QrVersions.auto,
                    size: large ? 260 : 196,
                    errorCorrectionLevel: QrErrorCorrectLevel.M,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: AbgColors.navy,
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: AbgColors.navy,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TrackingNumber(parcel.trackingNumber, size: large ? 18 : 15),
                const SizedBox(height: 2),
                Text(
                  '${parcel.originBranch} → ${parcel.destinationBranch}',
                  style: AbgText.caption,
                ),
                if (!large) ...[
                  const SizedBox(height: 4),
                  Text(
                    l.bookedBody,
                    style: AbgText.caption,
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String classificationShort(String c) => c.replaceAll('_', ' ');
}

class QrLabelScreen extends StatelessWidget {
  const QrLabelScreen({super.key, required this.parcel});

  final ParcelDetail parcel;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.showQr)),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AbgSpace.gutter),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: QrLabelCard(parcel: parcel, large: true),
          ),
        ),
      ),
    );
  }
}
