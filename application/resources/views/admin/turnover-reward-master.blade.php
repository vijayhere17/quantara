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
				<div class="panel-title">Existing Turnover Reward Milestones</div>
			</div>
			<div class="panel-body">
				<table class="table table-bordered">
					<thead>
						<tr>
							<th>Milestone #</th>
							<th>Turnover Amount ($)</th>
							<th>Cash Reward ($)</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						@foreach($rewards as $reward)
						<tr class="reward-row" data-id="{{ $reward->id }}">
							<td>{{ $reward->milestone_order }}</td>
							<td><input type="number" step="0.01" name="turnover_amount" class="form-control" value="{{ $reward->turnover_amount }}"></td>
							<td><input type="number" step="0.01" name="cash_reward" class="form-control" value="{{ $reward->cash_reward }}"></td>
							<td><button type="button" class="btn btn-black reward-update-btn">Update</button></td>
						</tr>
						@endforeach
					</tbody>
				</table>
				<div id="rewardMsg"></div>
			</div>
		</div>

		<div class="panel panel-primary" data-collapsed="0">
			<div class="panel-heading">
				<div class="panel-title">Add New Milestone</div>
			</div>
			<div class="panel-body">
				<form id="rewardAddForm" class="form-horizontal form-groups-bordered">
					<div class="form-group">
						<label class="col-sm-3 control-label">Milestone Order</label>
						<div class="col-sm-5">
							<input name="milestone_order" type="number" class="form-control" required>
						</div>
					</div>
					<div class="form-group">
						<label class="col-sm-3 control-label">Turnover Amount ($)</label>
						<div class="col-sm-5">
							<input name="turnover_amount" type="number" step="0.01" class="form-control" required>
						</div>
					</div>
					<div class="form-group">
						<label class="col-sm-3 control-label">Cash Reward ($)</label>
						<div class="col-sm-5">
							<input name="cash_reward" type="number" step="0.01" class="form-control" required>
						</div>
					</div>
					<div class="form-group">
						<div class="col-sm-offset-3 col-sm-5">
							<button type="submit" class="btn btn-black">Add Milestone</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
<br />
@endsection
@section('jscontent')
<script>
function csrfToken() {
	var el = document.getElementById('token');
	return el ? el.value : '';
}

function postJson(url, data, done) {
	fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRF-TOKEN': csrfToken(),
			'X-Requested-With': 'XMLHttpRequest'
		},
		body: JSON.stringify(data)
	}).then(function(r) { return r.json(); }).then(done).catch(function(e) {
		done({success: false, error_code: 'NETWORK_ERROR'});
	});
}

document.getElementById('rewardAddForm').addEventListener('submit', function(e) {
	e.preventDefault();
	var f = e.target;
	postJson('{{ URL::to("/admin/add-turnover-reward") }}', {
		milestone_order: f.milestone_order.value,
		turnover_amount: f.turnover_amount.value,
		cash_reward: f.cash_reward.value
	}, function(res) {
		if(res.success) { location.reload(); } else { document.getElementById('rewardMsg').innerText = 'Error: ' + (res.error_code || 'FAILED'); }
	});
});

document.querySelectorAll('.reward-update-btn').forEach(function(btn) {
	btn.addEventListener('click', function() {
		var row = btn.closest('.reward-row');
		var id = row.getAttribute('data-id');
		postJson('{{ URL::to("/admin/update-turnover-reward") }}/' + id, {
			turnover_amount: row.querySelector('[name="turnover_amount"]').value,
			cash_reward: row.querySelector('[name="cash_reward"]').value
		}, function(res) {
			document.getElementById('rewardMsg').innerText = res.success ? 'Updated successfully.' : ('Error: ' + (res.error_code || 'FAILED'));
		});
	});
});
</script>
@endsection
