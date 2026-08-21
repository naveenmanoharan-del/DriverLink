import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/app_button.dart';
import '../../widgets/status_chip.dart';

class JobDetailScreen extends StatefulWidget {
  final String jobId;
  const JobDetailScreen({super.key, required this.jobId});

  @override
  State<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends State<JobDetailScreen> {
  final _api = ApiClient();
  Job? _job;
  List<JobApplication> _applications = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final auth = context.read<AuthState>();
    try {
      final jobResult =
          await _api.get('/v1/jobs/${widget.jobId}') as Map<String, dynamic>;
      final appsResult =
          await _api.get(
                '/v1/jobs/${widget.jobId}/applications',
                token: auth.accessToken,
              )
              as List<dynamic>;
      setState(() {
        _job = Job.fromJson(jobResult);
        _applications =
            appsResult
                .map((e) => JobApplication.fromJson(e as Map<String, dynamic>))
                .toList();
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _decide(JobApplication app, String status) async {
    final auth = context.read<AuthState>();
    setState(() => _error = null);
    try {
      await _api.patch(
        '/v1/applications/${app.id}',
        token: auth.accessToken,
        body: {'status': status},
      );
      _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_job?.title ?? 'Job')),
      body:
          _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    _job!.location,
                    style: dataStyle(size: 13, color: AppColors.slate),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        '${_job!.currency} ${_job!.offeredRate} / ${_job!.rateUnit}',
                        style: dataStyle(size: 13),
                      ),
                      const SizedBox(width: 8),
                      StatusChip(status: _job!.status),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Applicants',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: AppColors.warn),
                      ),
                    ),
                  const SizedBox(height: 8),
                  if (_applications.isEmpty)
                    Text(
                      'No applications yet.',
                      style: dataStyle(size: 13, color: AppColors.slate),
                    ),
                  for (final app in _applications)
                    Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Proposed rate: ${app.proposedRate}',
                              style: dataStyle(
                                size: 13,
                                weight: FontWeight.w700,
                              ),
                            ),
                            if (app.message != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  '"${app.message}"',
                                  style: const TextStyle(
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                              ),
                            const SizedBox(height: 8),
                            StatusChip(status: app.status),
                            if (app.status == 'pending') ...[
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  AppButton(
                                    label: 'Accept',
                                    onPressed: () => _decide(app, 'accepted'),
                                  ),
                                  const SizedBox(width: 8),
                                  AppButton(
                                    label: 'Reject',
                                    variant: AppButtonVariant.secondary,
                                    onPressed: () => _decide(app, 'rejected'),
                                  ),
                                ],
                              ),
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
