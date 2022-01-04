jQuery(document).ready(function ($) {
    checkCookie();
    main();

    function makeGetRequest(path) {
        return new Promise(function (resolve, reject) {
            axios.get(path).then(
                (response) => {
                    var result = response.data;
                    console.log('Processing Request');
                    resolve(result);
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    async function main() {
        var result = await makeGetRequest('../backend/get_data.php');
        const baum_array = [];
        for (var i = 0; i < result.length; i++) {
            var baum = {
                id: (i+1),
                amount: [result[i].cb_anzahl],
                location: [result[i].lat, result[i].lng],
                skills: [1]
            };
            baum_array.push(baum);
        }
        var request = {
            jobs: baum_array,
            vehicles: [],
        }
        console.log(request);
    }
});
