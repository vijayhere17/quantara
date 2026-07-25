<?php
    use App\Models\CoinRateMaster;

    if(!function_exists('formatdate')){
        function formatdate($date, $format){
           return date($format, strtotime($date));
        }
    }
    
    if(!function_exists('formatdecimal')){
        function formatdecimal($amount, $decimal){
           return number_format((float)$amount, $decimal, '.', '');
        }
    }

    if(!function_exists('getcoinrate')){
        function getcoinrate(){
            try {
                $object = CoinRateMaster::orderBy('id', 'desc')->first();
                if ($object !== null && isset($object->rate) && (float) $object->rate > 0) {
                    return number_format((float) $object->rate, 8, '.', '');
                }
            } catch (\Throwable $e) {
                // table missing / empty
            }
            // Local Hardhat MockBTCPriceFeed default
            return number_format(60000.0, 8, '.', '');
        }
    }
    
    if(!function_exists('getwithdrawrate')){
        function getwithdrawrate(){
            return getcoinrate();
        }
    }

    if(!function_exists('obscureAddress')){
        function obscureAddress($address) {
            return substr($address, 0, 6) . '...' . substr($address, -4);
        }
    }

 
    