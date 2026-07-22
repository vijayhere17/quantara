@extends('admin.master')
@section('title', '')
@section('extra')
@endsection
@section('content')
<ol class="breadcrumb bc-3">
	<li>
		<a href="{{URL::to('/')}}/admin/home"><i class="entypo-home"></i>Home</a>
	</li>
	<li class="active">
		<strong>{{ $page_titel }}</strong>
	</li>
</ol>
<div class="row">
	<div class="col-md-12">
		<div class="panel panel-primary" data-collapsed="0">
			<div class="panel-heading">
				<div class="panel-title">{{ $page_titel }}</div>
			</div>
			<div class="panel-body">
				<table class="table table-bordered">
					<thead>
						<tr>
							<th>Member</th>
							<th>Milestone #</th>
							<th>Turnover Amount</th>
							<th>Cash Reward</th>
							<th>Leg 1</th>
							<th>Leg 2</th>
							<th>Leg 3</th>
							<th>Achieved On</th>
						</tr>
					</thead>
					<tbody>
						@foreach($achievers as $a)
						<tr>
							<td>{{ $a->member ? obscureAddress($a->member->username) : $a->member_id }}</td>
							<td>{{ $a->reward ? $a->reward->milestone_order : $a->reward_id }}</td>
							<td>${{ $a->reward ? number_format($a->reward->turnover_amount) : '-' }}</td>
							<td>${{ number_format($a->cash_reward) }}</td>
							<td>${{ number_format($a->leg1_business) }}</td>
							<td>${{ number_format($a->leg2_business) }}</td>
							<td>${{ number_format($a->leg3_business) }}</td>
							<td>{{ date('d/m/Y H:i:s', strtotime($a->created_at)) }}</td>
						</tr>
						@endforeach
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
<br />
@endsection
@section('jscontent')
@endsection
