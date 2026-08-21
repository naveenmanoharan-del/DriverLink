import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/fade_in.dart';
import '../../widgets/load_error.dart';

class WorkerApplicationsTab extends StatefulWidget {
  const WorkerApplicationsTab({super.key});

  @override
  State<WorkerApplicationsTab> createState() => _WorkerApplicationsTabState();
}

class _WorkerApplicationsTabState extends State<WorkerApplicationsTab> {
  final _api = ApiClient();
  List<JobApplication> _applications = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final auth = context.read<AuthState>();
    try {
      final result =
          await _api.get('/v1/applications/mine', token: auth.accessToken)
              as List<dynamic>;
      if (!mounted) return;
      setState(
        () =>
            _applications =
                result
                    .map(
                      (e) => JobApplication.fromJson(e as Map<String, dynamic>),
                    )
                    .toList(),
      );
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _error = messageFor(e, 'Could not load your applications.'),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _withdraw(JobApplication app) async {
    final auth = context.read<AuthState>();
    await _api.patch(
      '/v1/applications/${app.id}/withdraw',
      token: auth.accessToken,
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My applications'),
        automaticallyImplyLeading: false,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child:
            _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_error != null)
                      LoadError(message: _error!, onRetry: _load)
                    else if (_applications.isEmpty)
                      Text(
                        "You haven't applied to any jobs yet.",
                        style: dataStyle(size: 13, color: AppColors.slate),
                      ),
                    if (_error == null)
                      for (final (index, app) in _applications.indexed)
                        FadeIn(
                          delay: Duration(
                            milliseconds: 60 * (index.clamp(0, 8)),
                          ),
                          child: Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Proposed rate: ${app.proposedRate}',
                                          style: dataStyle(size: 13),
                                        ),
                                        const SizedBox(height: 6),
                                        StatusChip(status: app.status),
                                      ],
                                    ),
                                  ),
                                  if (app.status == 'pending')
                                    TextButton(
                                      onPressed: () => _withdraw(app),
                                      child: const Text(
                                        'Withdraw',
                                        style: TextStyle(color: AppColors.warn),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                  ],
                ),
      ),
    );
  }
}
