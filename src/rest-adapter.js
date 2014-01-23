angular.module('angular-datastore').provider('AngularDataRestAdapter', {

    baseUrl: null,

    setBaseUrl: function(url) {
        this.baseUrl = url;
    },

    $get: ['$http', '$q', 'AngularDataSerializer', function($http, $q, AngularDataSerializer) {

        var baseUrl = this.baseUrl;

        var getUrlForType = function(type) {
            return baseUrl + '/' + type;
        };


        return {

            findAll: function(type) {
                return $http.get(getUrlForType(type));
            },

            findMany: function(type, primaryKeys) {
                var globalPromise = $q.defer(),
                    promises = [],
                    results = [];
                angular.forEach(primaryKeys, function(primaryKey) {
                    promises.push(this.find(type, primaryKey).success(function(data) {
                        results.push(data);
                    }));
                }, this);

                $q.all(promises).then(function() {
                    globalPromise.resolve(results);
                }, function() {
                    globalPromise.reject(results);
                });

                var promise = globalPromise.promise;
                promise.success = function(fn) {
                    promise.then(function(response) {
                        fn(response);
                    });
                    return promise;
                };

                promise.error = function(fn) {
                    promise.then(null, function(response) {
                        fn(response);
                    });
                    return promise;
                };

                return promise;
            },

            find: function(type, primaryKey) {
                return $http.get(getUrlForType(type) + '/' + primaryKey);
            },

            findQuery: function(type, filters) {
                return $http({
                    method: 'GET',
                    url: getUrlForType(type),
                    params: filters
                });
            },

            remove: function(record) {
                return $http.delete(getUrlForType(record.getType()) + '/' + record.getPrimaryKey());
            },

            update: function(record) {
                return $http.put(getUrlForType(record.getType()) + '/' + record.getPrimaryKey(), AngularDataSerializer.serialize(record));
            },

            create: function(record) {
                return $http.post(getUrlForType(record.getType()), AngularDataSerializer.serialize(record));
            }
        };

    }]

});
