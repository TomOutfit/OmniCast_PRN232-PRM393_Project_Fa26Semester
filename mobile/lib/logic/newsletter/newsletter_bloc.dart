// OmniCast - Newsletter BLoC
// ------------------------------------------------------------
// One-shot state machine for the newsletter signup form.
// - `idle`    — user has not yet submitted
// - `sending` — request in flight
// - `ok`      — subscribed successfully (or already was)
// - `error`   — network / server error
//
// The form is one tap → success, so we don't model "loading
// more" or pagination here.
// ============================================================

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/repositories/newsletter_repository.dart';

// ============================================================
// EVENTS
// ============================================================

abstract class NewsletterEvent extends Equatable {
  const NewsletterEvent();
  @override
  List<Object?> get props => [];
}

class NewsletterSubscribeRequested extends NewsletterEvent {
  final String email;
  final List<NewsletterTopic> topics;
  final String locale;
  const NewsletterSubscribeRequested({
    required this.email,
    this.topics = const [
      NewsletterTopic.weeklySchedule,
      NewsletterTopic.aiCuratorPicks,
      NewsletterTopic.liveAlerts,
    ],
    this.locale = 'vi',
  });
  @override
  List<Object?> get props => [email, topics, locale];
}

class NewsletterReset extends NewsletterEvent {
  const NewsletterReset();
}

// ============================================================
// STATES
// ============================================================

abstract class NewsletterState extends Equatable {
  const NewsletterState();
  @override
  List<Object?> get props => [];
}

class NewsletterIdle extends NewsletterState {
  const NewsletterIdle();
}

class NewsletterSending extends NewsletterState {
  const NewsletterSending();
}

class NewsletterSuccess extends NewsletterState {
  /// `true` when the user was already on the list — UI should
  /// show a different copy ("Bạn đã đăng ký rồi!" vs "Đã đăng ký").
  final bool alreadySubscribed;
  final String email;
  final String locale;
  final List<String> topics;

  const NewsletterSuccess({
    required this.alreadySubscribed,
    required this.email,
    required this.locale,
    required this.topics,
  });

  @override
  List<Object?> get props => [alreadySubscribed, email, locale, topics];
}

class NewsletterFailure extends NewsletterState {
  final String message;
  const NewsletterFailure(this.message);
  @override
  List<Object?> get props => [message];
}

// ============================================================
// BLOC
// ============================================================

class NewsletterBloc extends Bloc<NewsletterEvent, NewsletterState> {
  final NewsletterRepository _repo;

  NewsletterBloc({required NewsletterRepository repository})
      : _repo = repository,
        super(const NewsletterIdle()) {
    on<NewsletterSubscribeRequested>(_onSubscribe);
    on<NewsletterReset>((_, emit) => emit(const NewsletterIdle()));
  }

  Future<void> _onSubscribe(
    NewsletterSubscribeRequested event,
    Emitter<NewsletterState> emit,
  ) async {
    final email = event.email.trim();
    if (email.isEmpty || !_isValidEmail(email)) {
      emit(const NewsletterFailure('Vui lòng nhập email hợp lệ.'));
      return;
    }
    emit(const NewsletterSending());
    try {
      final res = await _repo.subscribe(
        email: email,
        topics: event.topics,
        locale: event.locale,
      );
      emit(NewsletterSuccess(
        alreadySubscribed: res.alreadySubscribed,
        email: res.email,
        locale: res.locale,
        topics: res.topics,
      ));
    } catch (e) {
      emit(NewsletterFailure(_humanise(e)));
    }
  }

  bool _isValidEmail(String s) {
    // Pragmatic check — RFC 5322 is too permissive to enforce.
    final regex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    return regex.hasMatch(s);
  }

  String _humanise(Object e) {
    final raw = e.toString();
    if (raw.contains('SocketException') ||
        raw.contains('Failed host lookup') ||
        raw.contains('Connection refused')) {
      return 'Không có kết nối mạng. Vui lòng kiểm tra Wi-Fi hoặc dữ liệu di động.';
    }
    if (raw.contains('400') || raw.contains('Bad Request')) {
      return 'Email không hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (raw.contains('429')) {
      return 'Bạn thử quá nhiều lần. Vui lòng chờ một phút rồi thử lại.';
    }
    return 'Đăng ký thất bại. Vui lòng thử lại sau.';
  }
}
