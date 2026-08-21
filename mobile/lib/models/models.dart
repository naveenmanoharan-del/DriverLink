class Category {
  final String id;
  final String name;
  final String group;
  final String? description;

  Category({
    required this.id,
    required this.name,
    required this.group,
    this.description,
  });

  factory Category.fromJson(Map<String, dynamic> json) => Category(
    id: json['id'] as String,
    name: json['name'] as String,
    group: json['group'] as String,
    description: json['description'] as String?,
  );
}

class AppUser {
  final String id;
  final String phone;
  final String? email;
  final String role;
  final bool isActive;

  AppUser({
    required this.id,
    required this.phone,
    this.email,
    required this.role,
    required this.isActive,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: json['id'] as String,
    phone: json['phone'] as String,
    email: json['email'] as String?,
    role: json['role'] as String,
    isActive: json['isActive'] as bool,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'phone': phone,
    'email': email,
    'role': role,
    'isActive': isActive,
  };
}

class WorkerProfile {
  final String id;
  final String userId;
  final String firstName;
  final String? lastName;
  final String categoryId;
  final List<String> skills;
  final int yearsExperience;
  final String? bio;
  final String availability;
  final String minRate;
  final String rateUnit;
  final String currency;
  final String? city;
  final String rating;
  final int completedJobs;
  final String verificationStatus;

  WorkerProfile({
    required this.id,
    required this.userId,
    required this.firstName,
    this.lastName,
    required this.categoryId,
    required this.skills,
    required this.yearsExperience,
    this.bio,
    required this.availability,
    required this.minRate,
    required this.rateUnit,
    required this.currency,
    this.city,
    required this.rating,
    required this.completedJobs,
    required this.verificationStatus,
  });

  factory WorkerProfile.fromJson(Map<String, dynamic> json) => WorkerProfile(
    id: json['id'] as String,
    userId: json['userId'] as String,
    firstName: json['firstName'] as String,
    lastName: json['lastName'] as String?,
    categoryId: json['categoryId'] as String,
    skills:
        (json['skills'] as List<dynamic>? ?? [])
            .map((e) => e as String)
            .toList(),
    yearsExperience: json['yearsExperience'] as int,
    bio: json['bio'] as String?,
    availability: json['availability'] as String,
    minRate: json['minRate'] as String,
    rateUnit: json['rateUnit'] as String,
    currency: json['currency'] as String,
    city: json['city'] as String?,
    rating: json['rating'] as String,
    completedJobs: json['completedJobs'] as int,
    verificationStatus: json['verificationStatus'] as String,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'firstName': firstName,
    'lastName': lastName,
    'categoryId': categoryId,
    'skills': skills,
    'yearsExperience': yearsExperience,
    'bio': bio,
    'availability': availability,
    'minRate': minRate,
    'rateUnit': rateUnit,
    'currency': currency,
    'city': city,
    'rating': rating,
    'completedJobs': completedJobs,
    'verificationStatus': verificationStatus,
  };
}

class ClientProfile {
  final String id;
  final String userId;
  final String name;
  final String? companyName;
  final String clientType;
  final String? address;
  final String? city;

  ClientProfile({
    required this.id,
    required this.userId,
    required this.name,
    this.companyName,
    required this.clientType,
    this.address,
    this.city,
  });

  factory ClientProfile.fromJson(Map<String, dynamic> json) => ClientProfile(
    id: json['id'] as String,
    userId: json['userId'] as String,
    name: json['name'] as String,
    companyName: json['companyName'] as String?,
    clientType: json['clientType'] as String,
    address: json['address'] as String?,
    city: json['city'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'name': name,
    'companyName': companyName,
    'clientType': clientType,
    'address': address,
    'city': city,
  };
}

class Job {
  final String id;
  final String clientId;
  final String categoryId;
  final String title;
  final String? description;
  final String location;
  final int workersRequired;
  final String offeredRate;
  final String rateUnit;
  final String currency;
  final String startsAt;
  final String? endsAt;
  final String status;

  Job({
    required this.id,
    required this.clientId,
    required this.categoryId,
    required this.title,
    this.description,
    required this.location,
    required this.workersRequired,
    required this.offeredRate,
    required this.rateUnit,
    required this.currency,
    required this.startsAt,
    this.endsAt,
    required this.status,
  });

  factory Job.fromJson(Map<String, dynamic> json) => Job(
    id: json['id'] as String,
    clientId: json['clientId'] as String,
    categoryId: json['categoryId'] as String,
    title: json['title'] as String,
    description: json['description'] as String?,
    location: json['location'] as String,
    workersRequired: json['workersRequired'] as int,
    offeredRate: json['offeredRate'] as String,
    rateUnit: json['rateUnit'] as String,
    currency: json['currency'] as String,
    startsAt: json['startsAt'] as String,
    endsAt: json['endsAt'] as String?,
    status: json['status'] as String,
  );
}

class JobApplication {
  final String id;
  final String jobId;
  final String workerId;
  final String proposedRate;
  final String? message;
  final String status;

  JobApplication({
    required this.id,
    required this.jobId,
    required this.workerId,
    required this.proposedRate,
    this.message,
    required this.status,
  });

  factory JobApplication.fromJson(Map<String, dynamic> json) => JobApplication(
    id: json['id'] as String,
    jobId: json['jobId'] as String,
    workerId: json['workerId'] as String,
    proposedRate: json['proposedRate'] as String,
    message: json['message'] as String?,
    status: json['status'] as String,
  );
}
