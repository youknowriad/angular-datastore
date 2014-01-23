angular.module('angular-datastore').service('AngularDataSerializer', function() {

    return {

        serialize: function(record, withPrimaryKey) {
            var hash = {};
            withPrimaryKey = withPrimaryKey || true;

            angular.forEach(record.getAttributes(), function(attribute) {
                if (withPrimaryKey || attribute !== record.getPrimaryKeyAttribute()) {
                    hash[attribute] = record[attribute];
                }
            });

            angular.forEach(record.getHasManyAttributes(), function(relationTarget, relationName) {
                hash[relationName] = record.__private.__hasMany[relationName];
            });

            return hash;
        },

        unserialize: function(model, hash, store) {
            var record = new model(store);
            this.hydrate(record, hash);

            return record;
        },

        hydrate: function(record, hash) {
            angular.forEach(record.getAttributes(), function(attribute) {
                record[attribute] = hash[attribute];
            });

            angular.forEach(record.getHasManyAttributes(), function(relationTarget, relationName) {
                record.__private.__hasMany[relationName] = hash[relationName] || [];
            });
        }

    };

});
