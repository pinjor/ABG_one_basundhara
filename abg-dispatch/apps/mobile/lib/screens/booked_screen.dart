import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';
import 'qr_label_screen.dart';

/// Shown once after booking: the QR label and the sender's handover PIN.
/// The PIN is never retrievable again; the server stores only its hash.
class BookedScreen extends StatelessWidget {
  const BookedScreen({super.key, required this.result});

  final Json result;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final parcel = ParcelDetail(result['parcel'] as Json);
    final pin = result['handoverPin'] as String?;
    final top = MediaQuery.of(context).padding.top;
    return Scaffold(
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          HeroBackground(
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(30),
            ),
            child: Padding(
              padding: EdgeInsets.fromLTRB(24, top + 28, 24, 86),
              child: Column(
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AbgGradients.platinum,
                    ),
                    child: Container(
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: AbgColors.success,
                      ),
                      child: const Icon(
                        Icons.check_rounded,
                        color: Colors.white,
                        size: 40,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    parcel.status == 'DRAFT' ? l.saveDraft : l.bookedTitle,
                    style: AbgText.h1.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l.bookedBody,
                    style: AbgText.small.copyWith(color: AbgColors.platinum),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          Transform.translate(
            offset: const Offset(0, -62),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AbgSpace.gutter),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (parcel.qrPayload != null) QrLabelCard(parcel: parcel),
                  if (pin != null) ...[
                    const SizedBox(height: 14),
                    SectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.pin_outlined,
                                color: AbgColors.navy500,
                              ),
                              const SizedBox(width: 10),
                              Text(l.handoverPin, style: AbgText.h3),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: AbgColors.surface,
                              borderRadius: BorderRadius.circular(AbgRadii.md),
                              border: Border.all(color: AbgColors.border),
                            ),
                            child: Semantics(
                              label: 'Handover PIN ${pin.split('').join(' ')}',
                              child: ExcludeSemantics(
                                child: Text(
                                  pin,
                                  textAlign: TextAlign.center,
                                  style: AbgText.hero.copyWith(
                                    letterSpacing: 12,
                                    fontFeatures: const [
                                      FontFeature.tabularFigures(),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(l.handoverPinHint, style: AbgText.small),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: () =>
                        context.pushReplacement('/parcels/${parcel.id}'),
                    icon: const Icon(Icons.visibility_outlined),
                    label: Text(l.viewParcel),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: () => context.pushReplacement('/create'),
                    icon: const Icon(Icons.add_rounded),
                    label: Text(l.bookAnother),
                  ),
                  TextButton(
                    onPressed: () => context.go('/home'),
                    child: Text(l.done),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
