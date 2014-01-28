angular.module('angular-datastore').factory('AngularDataModelFactory', function() {

    return {

        get: function(configuration) {

            return function() {

                var o = {

                    __relations : [],

                    isNew: false,

                    getType: function() {
                        return configuration.name;
                    },

                    getAttributes: function() {
                        return configuration.attributes;
                    },

                    getHasManyAttributes: function() {
                        return configuration.hasMany;
                    },

                    getHasOneAttributes: function() {
                        return configuration.hasOne;
                    }
                };

                if (configuration.type !== 'abstract') {
                    o.getPrimaryKeyAttribute = function() {
                        return configuration.primaryKey;
                    };

                    o.getPrimaryKey = function() {
                        return o[configuration.primaryKey];
                    };
                }

                return o;

            };

        }

    };

});
