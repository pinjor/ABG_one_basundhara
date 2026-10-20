import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/session.dart';
import '../l10n/app_localizations.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';

/// Phone + one-time code for drivers, messengers and other non-employees.
/// The resulting session can only see the parcels assigned to that number.
class GuestLoginScreen extends StatefulWidget {
  const GuestLoginScreen({super.key});

  @override
  State<GuestLoginScreen> createState() => _GuestLoginScreenState();
}

class _GuestLoginScreenState extends State<GuestLoginScreen> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  bool _codeSent = false;
  bool _busy = false;
  String? _devCode;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_phone.text.replaceAll(RegExp(r'\D'), '').length < 10) {
      setState(() => _error = L.of(context).required);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await context.read<SessionController>().requestGuestCode(
        _phone.text,
      );
      setState(() {
        _codeSent = true;
        _devCode = res['devOtp'] as String?;
      });
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<SessionController>().verifyGuest(
        _phone.text,
        _code.text,
      );
    } catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      backgroundColor: AbgColors.midnight,
      body: HeroBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  tooltip: l.back,
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(
                    Icons.arrow_back_rounded,
                    color: AbgColors.platinumBright,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Center(child: AbgLogo(width: 140)),
              const SizedBox(height: 28),
              Text(
                l.guestTitle,
                style: AbgText.h1.copyWith(color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                l.guestSubtitle,
                style: AbgText.body.copyWith(color: AbgColors.platinum),
              ),
              const SizedBox(height: 26),
              _DarkField(
                controller: _phone,
                label: l.phoneLabel,
                icon: Icons.phone_iphone_rounded,
                keyboard: TextInputType.phone,
                enabled: !_codeSent,
                hint: '01XXXXXXXXX',
              ),
              if (_codeSent) ...[
                const SizedBox(height: 12),
                Text(
                  l.codeSentTo(_phone.text),
                  style: AbgText.small.copyWith(color: AbgColors.platinumDeep),
                ),
                const SizedBox(height: 12),
                _DarkField(
                  controller: _code,
                  label: l.codeLabel,
                  icon: Icons.password_rounded,
                  keyboard: TextInputType.number,
                  autofocus: true,
                  maxLength: 6,
                  onChanged: (_) => setState(() {}),
                ),
                if (_devCode != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      l.devCode(_devCode!),
                      style: AbgText.mono.copyWith(color: AbgColors.platinum),
                    ),
                  ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 14),
                Text(
                  _error!,
                  style: AbgText.small.copyWith(
                    color: const Color(0xFFFF9C9C),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 26),
              PlatinumButton(
                label: _codeSent ? l.verifyContinue : l.sendCode,
                icon: _codeSent
                    ? Icons.verified_user_outlined
                    : Icons.sms_outlined,
                busy: _busy,
                onPressed: _codeSent
                    ? (_code.text.length == 6 ? _verify : null)
                    : _send,
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  const Icon(
                    Icons.info_outline_rounded,
                    color: AbgColors.platinumDeep,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      l.guestSessionNote,
                      style: AbgText.caption.copyWith(
                        color: AbgColors.platinumDeep,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DarkField extends StatelessWidget {
  const _DarkField({
    required this.controller,
    required this.label,
    required this.icon,
    this.keyboard,
    this.enabled = true,
    this.autofocus = false,
    this.maxLength,
    this.hint,
    this.onChanged,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final TextInputType? keyboard;
  final bool enabled;
  final bool autofocus;
  final int? maxLength;
  final String? hint;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(AbgRadii.md),
      borderSide: const BorderSide(color: Color(0x33CAD0D8)),
    );
    return TextField(
      controller: controller,
      onChanged: onChanged,
      enabled: enabled,
      autofocus: autofocus,
      keyboardType: keyboard,
      maxLength: maxLength,
      style: AbgText.body.copyWith(
        color: Colors.white,
        fontSize: 17,
        letterSpacing: 1,
      ),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.06),
        labelText: label,
        hintText: hint,
        counterText: '',
        hintStyle: AbgText.body.copyWith(color: AbgColors.navy500),
        labelStyle: AbgText.small.copyWith(color: AbgColors.platinumDeep),
        floatingLabelStyle: AbgText.small.copyWith(color: AbgColors.platinum),
        prefixIcon: Icon(icon, color: AbgColors.platinumDeep),
        border: border,
        enabledBorder: border,
        disabledBorder: border,
        focusedBorder: border.copyWith(
          borderSide: const BorderSide(color: AbgColors.platinum, width: 1.4),
        ),
      ),
    );
  }
}
