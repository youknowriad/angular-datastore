angular.module('angular-datastore').service('AngularDataSerializer', function() {

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

            angular.forEach(record.getAttributes(), function(attribute) {
                if (withPrimaryKey || attribute !== record.getPrimaryKeyAttribute()) {
                    hash[attribute] = record[attribute];
                }
            });

            angular.forEach(record.getHasManyAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        hash[relationName] = record.__private.__relations[relationName];
                        break;
                    case 'embed':
                        var serials = [];
                        angular.forEach(record.__private.__relations[relationName], function(subrecord) {
                            serials.push(this.serialize(subrecord, false));
                        }, this);
                        hash[relationName] = serials;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);

            angular.forEach(record.getHasOneAttributes(), function(relation, relationName) {
                    switch (relation.type) {
                        case 'id':
                            hash[relationName] = record.__private.__relations[relationName];
                            break;
                        case 'embed':
                            hash[relationName] = this.serialize(record.__private.__relations[relationName], false);
                            break;
                        default:
                            throw 'unknown relation type ' + relation.type;
                    }
            }, this);

            return hash;
        },

        unserialize: function(name, hash, store) {
            var record = new models[name](store);
            this.hydrate(record, hash, store);

            return record;
        },

        hydrate: function(record, hash, store) {
            angular.forEach(record.getAttributes(), function(attribute) {
                record[attribute] = hash[attribute];
            });

            angular.forEach(record.getHasManyAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        record.__private.__relations[relationName] = hash[relationName] || [];
                        break;
                    case 'embed':
                        var subrecords = [];
                        angular.forEach(hash[relationName], function(subhash) {
                            subrecords.push(this.unserialize(relation.target, subhash, store));
                        }, this);
                        record.__private.__relations[relationName] = subrecords;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);

            angular.forEach(record.getHasOneAttributes(), function(relation, relationName) {
                switch (relation.type) {
                    case 'id':
                        record.__private.__relations[relationName] = hash[relationName] || null;
                        break;
                    case 'embed':
                        record.__private.__relations[relationName] = hash[relationName] ? this.unserialize(relation.target, hash[relationName], store) : null;
                        break;
                    default:
                        throw 'unknown relation type ' + relation.type;
                }
            }, this);
        }

    };

});
