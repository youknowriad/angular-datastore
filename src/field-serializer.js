angular.module('angular-datastore').service('FieldSerializer', [function() {

    return {

        serialize: function(field, value) {
            return value;
        },

        unserialize: function (field, serial) {
            switch (field.type) {
                case 'date':
                    return serial ? new Date(serial) : null;
                default:
                    return serial;
            }
        }
    };

}]);
