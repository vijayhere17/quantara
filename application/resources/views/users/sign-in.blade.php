@include('users.layouts.auth-react', [
    'page_titel' => $page_titel ?? 'Sign In · Quantara',
    'boot' => [
        'page' => 'login',
    ],
    'authScript' => 'assets/js/users/sign-in.0.4.js',
])
