
(function(g, e, l){

    function w(A) {
        var B = r(A.location);
        m.trigger({
            type: "update-username-menu-link",
            redirectUri: encodeURIComponent(B.href)
        })
    }
    function s(D, E, F, H, I, L) {
        var J, C, B, A, G = F ? F : H, K;
        if (D) {
            B = G;
            A = i(E);
            J = L;
            C = I
        } else {
            J = G;
            C = E
        }
        return {
            loginDisplayNameAccount: J,
            loginDisplayNameUser: C,
            roleDisplayNameAccount: B,
            roleDisplayNameUser: A
        }
    }
    function h(B, A) {
        if (B) {
            return "Logged in as:"
        }
        if (A == "iam") {
            return "IAM User:"
        }
        if (A == "federated") {
            return "Federated Login:"
        }
        if (A == "assumed-role") {
            return "Federated Login:"
        }
    }
    function u(A) {
        if (A) {
            return "Currently active as:"
        }
    }
    function t(E, F, B, D, C) {
        if (E && E.displayName) {
            return E.displayName
        }
        if (C == "root") {
            return F
        }
        var A = z(F, F, B, D);
        if (A) {
            return A
        }
    }
    function z(F, B, C, E) {
        var A, D;
        A = (F ? F : B);
        D = (C ? C : E);
        if (!D) {
            return A
        }
        return A + " @ " + D
    }
    function b(B) {
        var A = decodeURIComponent(e.trim(B)).replace(/^federated-user\//, "").replace(/^assumed-role\//, "").replace(/&#\d{1,5};/g, function(C) {
            return e("<div>" + C + "</div>").text()
        });
        if (A) {
            return A
        }
    }
    function q(A) {
        if (typeof A == "number") {
            return A
        }
    }
    function k(A) {
        if (/^[a-z0-9\-\.]+$/.exec(A)) {
            return A
        }
    }
    function d(A) {
        if (!/[<>]/.test(A)) {
            return A
        }
    }
    function hashCode(str) { // java String#hashCode
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
           hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    function intToRGB(i){
        var c = (i & 0x00FFFFFF)
            .toString(16)
            .toUpperCase();

        return "00000".substring(0, 6 - c.length) + c;
    }
    function p(A) {
        if (A) {
            A = A.slice(0, 5);
            return e.map(A, function(D, C) {
                var B = b(D.d);
                if (!B) {
                    B = D.r
                }
                return {
                    roleName: D.r,
                    roleColor: intToRGB(hashCode(B)),
                    displayName: B,
                    accountId: D.a,
                    formattedAccountId: l.formatAccountNumber(D.a),
                    mfaNeeded: !!(D.m)
                }
            })
        }
        return []
    }
    function y(B, A) {
        return !!(B === "assumed-role" && A)
    }
    function i(B) {
        var A = /^(.+)\/(.+)$/.exec(B);
        return A ? A[1] : B
    }
    function j(B) {
        var A = /^(.*\/)?(.+)$/.exec(B);
        return A ? A[2] : B
    }
    function n(C, B, D, G, E) {
        var F = false;
        var A = undefined;
        if (C) {
            A = c(B, D, G, E);
            if (typeof A !== "undefined") {
                A.current = true
            } else {
                F = true
            }
        }
        m.trigger({
            type: "recent-role-lookup",
            roleLookupFailure: F
        });
        return A
    }
    function c(B, C, F, E) {
        if (C.length > 0) {
            for (var D = 0; D < C.length; D++) {
                var A = C[D];
                if (o(B, F, E, A)) {
                    return A
                }
            }
        }
        return undefined
    }
    function o(F, I, E, H) {
        var B = H.accountId.toString()
          , C = (I === B)
          , J = (E.toLowerCase() === B.toLowerCase())
          , K = (C || J)
          , L = j(H.roleName)
          , G = (!!F) && (!!L)
          , D = (F === L)
          , A = (G && D);
        return K && A
    }
    function x(A) {
        return !!(A === "iam" || A === "assumed-role")
    }
    function v(B) {
        if (B) {
            var A = /^[0-9a-fA-F]{6}$/.exec(B);
            if (A) {
                return B
            }
        }
        return ""
    }
    function f(B) {
        var A;
        if (B) {
            try {
                A = JSON.parse(B)
            } catch (C) {}
        }
        if (!A) {
            A = {}
        }
        return A
    }
    function r(A) {
        return e.extend({}, A)
    }
        var m = e(g);
            var I = f(ConsoleNavService.Util.getCookie("aws-userInfo"))
            , J = f(ConsoleNavService.Util.getCookie("noflush_awsc-roleInfo"))
            , C = l.parseArn(I.arn)
            , G = C.identityType
            , F = b(I.username)
            , R = b(J.bn)
            , O = l.formatAccountNumber(b(I.alias))
            , Q = l.formatAccountNumber(b(J.ba))
            , S = C.formattedAccountNumber
            , H = y(G, R)
            , L = x(G)
            , K = p(J.rl)
            , N = i(F)
            , M = {roleDisplayNameAccount:I.alias, roleDisplayNameUser: I.arn.split("/").slice(-2, -1)[0]}
            , D = r(ConsoleNavService.Model)
            , B = r(D.features)
            , A = r(B.userNameMenu)
            , E = s(M, F, O, S, R, Q);
        K = []
        for (role in document.extraRoles) {
           var accid = document.extraRoles[role].split("/")[0].split(":").slice(-2,-1)[0];
           var rolename = document.extraRoles[role].split("/").pop();
           K.push({displayName: role, roleName: rolename, accountId: accid, formattedAccountId: accid, mfaNeeded: false});
        }
        for(var x=0; x< K.length; x++ ){
            K[x].roleColor = intToRGB(hashCode(K[x].displayName));
        }
        AWSC.jQuery(AWSC).trigger(
            {
            type: "update-username-menu",
            accountType: G,
            csrf: q(AWSC.Auth.getMbtc()),
            signinEndpoint: k(AWSC.jQuery("meta#awsc-signin-endpoint").attr("content")),
            logoutURL: d(B.logoutURL),
            optionalMenuItems: A.optionalMenuItems,
            currentRole: M,
            loginDisplayNameAccount: E.loginDisplayNameAccount,
            loginDisplayNameUser: E.loginDisplayNameUser,
            loginDisplayNameLabel: h(M, G),
            roleDisplayNameAccount: E.roleDisplayNameAccount,
            roleDisplayNameUser: E.roleDisplayNameUser,
            roleDisplayNameLabel: u(M),
            displayName: t(M, F, O, S, G),
            switchRoleAvailable: L,
            recentRoleLinks: K
        });
        console.log("loaded")
})(AWSC, AWSC.jQuery, AWSC.Arn)


// hack to get hiding of the menu to work again
AWSC.jQuery("#nav-usernameMenu").on("click", function(event) {
    // setTimeout(function() {
    //     console.log(AWSC.jQuery("#usernameMenuContent")[0].style.display)
         if(AWSC.jQuery("#nav-usernameMenu")[0].classList.contains("active") == false) {
              AWSC.jQuery("#usernameMenuContent")[0].style.display = "none";
        }
    // },250)
});
