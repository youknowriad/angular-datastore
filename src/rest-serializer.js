angular.module('angular-datastore').service('AngularDataSerializer', ['$q', 'FieldSerializer', function($q, FieldSerializer) {

    /**
     * Array of model configs
     * @type {{}}
     */
    var models = {};

    return {

        addModel: function(type, model) {
            models[type] = model;
        },

        serialize: function(record, withPrimaryKey) {
            var hash = {};
            withPrimaryKey = withPrimaryKey || true;

            angular.forEach(record.getFields(), function(field, fieldName) {
                if (withPrimaryKey || fieldName !== record.getPrimaryKeyAttribute()) {
                    hash[fieldName] = FieldSerializer.serialize(field, record[fieldName]);
                }
            }, this);

            angular.forEach(record.getHasManyAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        hash[relationName] = record[relationName];
                        break;
                    case 'embed':
                        var ids = [];
                        angular.forEach(record[relationName], function(subrecord) {
                            ids.push(this.serialize(subrecord, false));
                        }, this);
                        hash[relationName] = ids;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);

            angular.forEach(record.getHasOneAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        hash[relationName] = record[relationName];
                        break;
                    case 'embed':
                        hash[relationName] = this.serialize(record[relationName], false);
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);

            return hash;
        },

        unserialize: function(name, hash, store, newRecord) {
            var record = new models[name]();
            record.isNew = newRecord || false;
            this.hydrate(record, hash, store, newRecord);

            return record;
        },

        hydrate: function(record, hash, store, newRecord) {

            angular.forEach(record.getFields(), function(field, fieldName) {
                record[fieldName] = FieldSerializer.unserialize(field, hash[fieldName]);
            }, this);

            angular.forEach(record.getHasManyAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        var hasManyHash = hash[relationName] || [];
                        record[relationName] = hasManyHash;
                        record[ 'get' + relationName.charAt(0).toUpperCase() + relationName.slice(1) ] = function() {
                            var deferred = $q.defer();
                            store.findMany(relation.target, record[relationName]).then(function(newHasMany) {
                                deferred.resolve(newHasMany);
                            });

                            return deferred.promise;
                        };

                        break;
                    case 'embed':
                        var subrecords = [];
                        angular.forEach(hash[relationName], function(subhash) {
                            subrecords.push(this.unserialize(relation.target, subhash, store, newRecord));
                        }, this);
                        record[relationName] = subrecords;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);

            angular.forEach(record.getHasOneAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        var hasOneHash = hash[relationName] || null;
                        record[relationName] = hasOneHash;
                        record[ 'get' + relationName.charAt(0).toUpperCase() + relationName.slice(1) ] = function() {
                            var deferred = $q.defer();
                            store.find(relation.target, record[relationName]).then(function(newHasOne) {
                                deferred.resolve(newHasOne);
                            });

                            return deferred.promise;
                        };

                        break;
                    case 'embed':
                        record[relationName] = hash[relationName] ? this.unserialize(relation.target, hash[relationName], store, newRecord) : null;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);
        }

    };

}]);
