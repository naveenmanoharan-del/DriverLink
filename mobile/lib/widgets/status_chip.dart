import 'package:flutter/material.dart';
import '../theme.dart';

const Map<String, Color> _statusColor = {
  'open': AppColors.signalDark,
  'available': AppColors.signalDark,
  'applied': AppColors.stampDark,
  'assigned': AppColors.stampDark,
  'accepted': AppColors.stampDark,
  'verified': AppColors.stampDark,
  'in_progress': AppColors.stampDark,
  'completed': AppColors.ink,
  'pending': AppColors.slate,
  'offline': AppColors.slate,
  'engaged': AppColors.slate,
  'rejected': AppColors.warn,
  'withdrawn': AppColors.warn,
  'cancelled': AppColors.warn,
};

class StatusChip extends StatelessWidget {
  final String status;
  const StatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor[status] ?? AppColors.slate;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: dataStyle(size: 12, weight: FontWeight.w600, color: color),
      ),
    );
  }
}
