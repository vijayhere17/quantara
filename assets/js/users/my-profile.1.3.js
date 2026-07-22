const is_active = PHP2JS.data.user.kit_id, is_auth = PHP2JS.data.user.is_authenticator;

let user = PHP2JS.data.user;
const BASEPATH = document.getElementById('basePath').value;
const token = document.getElementById('token').value;

jQuery(document).ready(function() {
	$("#username").val(user.username);
    $("#firstname").val(user.firstname);
    $("#lastname").val(user.lastname);
    $("#email").val(user.email);
    
    if(user.wallet_addr != undefined)
    {
       // document.getElementById('wallet_addr').readOnly = true;
    }
    
    // document.getElementById('email').readOnly = true;
    
    document.getElementById('username').readOnly = true;
});

jQuery('.btn-otp-submit').bind('click', function(e) {
    e.preventDefault();
    if (validate(false)) {
        processupdate(false);
    }
});

jQuery('.btn-submit').bind('click', function(e) {
    e.preventDefault();
    if (validate(true)) {
        processupdate(true);
    }
});

function validate(otpstatus) {
    var firstname = $("#firstname").val();
    var lastname = $("#lastname").val();
    var email = $("#email").val();
    var otp = $("#otp").val();
    
    if (firstname == '') {
        erroralert('Please enter first name');
        return false;
    }
    
    if (lastname == '') {
        erroralert('Please enter last name');
        return false;
    }
    
    if (email == '') {
        erroralert('Please enter email');
        return false;
    }
    
    if(is_active > 0){
        if(is_auth > 0){
            if(otpstatus){
                if (otp == '') {
                    erroralert('Please enter a google 2fa code.');
                    return false;
                }
            }
        }
    }

    return true;
}

function processupdate(status) {
    var firstname = $("#firstname").val();
    var lastname = $("#lastname").val();
    var email = $("#email").val();
    var otp = $("#otp").val();

    var reqObj = {
        _token: token,
        firstname : firstname,
        lastname : lastname,
        email : email, 
        otp : otp,
        status : status
    };

    

    $.ajax({
        type: 'POST',
        url: BASEPATH + "/submit-update-profile", 
        data: reqObj,
        dataType: 'json',
        success: function(result) {
           if (result.success) {
                if(status){
                    successalert('Profile Update submited successfully!');
                    $("#otp").val('');
                }else{
                    successalert('OTP send your register email id!');
                    $(".btn-otp-submit").hide();
                    $(".btn-submit").show();
                }
            } else {
                erroralert(result.error);
            }
            // unblockui();
        },
        error: function(xhr) {
            var msg = 'Something went wrong. Please try again.';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                msg = xhr.responseJSON.error;
            }
            erroralert(msg);
        }
    });
}

/* ---------------------------------------------------------
   Alert helpers
   These were being called above but were never defined,
   which caused a silent JS error and stopped the success
   alert from ever showing.
--------------------------------------------------------- */

function successalert(message) {
    // hide error alert if visible
    $("#profileErrorAlert").addClass('d-none').removeClass('d-flex');

    // update success alert text (keep the bold title, update the message part)
    $("#profileSuccessAlert").find('div').html('<strong>Profile Updated!</strong><br>' + message);

    // show success alert
    $("#profileSuccessAlert").removeClass('d-none').addClass('d-flex');

    // scroll to it so the user notices
    $('html, body').animate({
        scrollTop: $("#profileSuccessAlert").offset().top - 100
    }, 300);

    // auto-hide after 4 seconds
    setTimeout(function() {
        $("#profileSuccessAlert").addClass('d-none').removeClass('d-flex');
    }, 4000);
}

function erroralert(message) {
    // hide success alert if visible
    $("#profileSuccessAlert").addClass('d-none').removeClass('d-flex');

    // set error text
    $("#profileErrorText").html(message);

    // show error alert
    $("#profileErrorAlert").removeClass('d-none').addClass('d-flex');

    // scroll to it so the user notices
    $('html, body').animate({
        scrollTop: $("#profileErrorAlert").offset().top - 100
    }, 300);
}